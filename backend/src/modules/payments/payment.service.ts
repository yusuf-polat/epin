import { Payment } from '@prisma/client';
import { env } from '@/config/env';
import { withTransaction } from '@/database/transaction';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { formatTRY, roundMoney, toNumber } from '@/utils/money';
import { PageParams } from '@/utils/pagination';
import { notificationService } from '@/modules/notifications/notification.service';
import { userRepository } from '@/modules/users/user.repository';
import { walletRepository } from '@/modules/wallet/wallet.repository';
import { paymentRepository } from './payment.repository';
import { calculateFee, gatewayService } from './gateway.service';
import { MAX_RECENT_PENDING_PAYMENTS, PENDING_CRYPTO_TTL_MINUTES, PENDING_PAYMENT_TTL_MINUTES } from './payment.constants';
import { AdminPaymentListQuery, CheckoutDTO } from './payment.types';
import { isOnlineProvider, ONLINE_ADAPTERS } from './providers';
import { ProviderOutcome } from './providers/types';
import { stripeGateway, stripeOutcome, StripeEvent, verifyStripeSignature } from './providers/stripe';
import { PaytrCallback, paytrOutcome, verifyPaytrCallback } from './providers/paytr';
import { iyzicoGateway } from './providers/iyzico';
import { NowpaymentsIpn, nowpaymentsOutcome, verifyNowpaymentsIpn } from './providers/nowpayments';

const toView = (p: Payment) => ({
  id: p.id,
  provider: p.provider,
  status: p.status,
  amount: toNumber(p.amount),
  fee: toNumber(p.fee),
  chargeAmount: toNumber(p.chargeAmount),
  currency: p.currency,
  failureReason: p.failureReason,
  testMode: p.testMode,
  // Ödeme yarım kaldıysa kullanıcı aynı ödeme sayfasına dönebilir
  checkoutUrl: p.status === 'PENDING' ? p.checkoutUrl : null,
  createdAt: p.createdAt,
  completedAt: p.completedAt,
});

const shortId = (id: string) => id.slice(0, 8).toUpperCase();
export const paymentReturnUrl = (id: string) => `${env.frontendUrl}/hesabim/cuzdan/odeme/${id}`;

/** Sağlayıcının bildirdiği tutar, tahsil edilmesi gereken tutarla kuruşu kuruşuna eşleşmeli */
export const amountMatches = (payment: Pick<Payment, 'chargeAmount' | 'currency'>, paid: number, currency: string) =>
  Math.abs(roundMoney(paid) - toNumber(payment.chargeAmount)) < 0.005 && currency.toUpperCase() === payment.currency.toUpperCase();

export const paymentService = {
  /** Online ödeme başlatır: kayıt açılır, sağlayıcıda ödeme oturumu oluşturulur */
  async checkout(userId: string, dto: CheckoutDTO, ip: string) {
    const gateway = await gatewayService.resolve(dto.provider);
    if (!isOnlineProvider(dto.provider) || !gatewayService.isUsable(gateway)) {
      throw new BadRequestError('Bu ödeme yöntemi şu anda kullanılamıyor', 'PAYMENT_METHOD_UNAVAILABLE');
    }
    if (dto.amount < gateway.minAmount || dto.amount > gateway.maxAmount) {
      throw new BadRequestError(
        `${gateway.displayName} ile ${formatTRY(gateway.minAmount)} - ${formatTRY(gateway.maxAmount)} arası yükleme yapılabilir`,
        'AMOUNT_OUT_OF_RANGE'
      );
    }
    const since = new Date(Date.now() - 60 * 60_000);
    if ((await paymentRepository.countRecentPending(userId, since)) >= MAX_RECENT_PENDING_PAYMENTS) {
      throw new BadRequestError('Tamamlanmamış çok fazla ödemeniz var. Lütfen bir süre sonra tekrar deneyiniz.', 'TOO_MANY_PENDING');
    }
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('Kullanıcı bulunamadı');

    const fee = calculateFee(dto.amount, gateway);
    const payment = await paymentRepository.create({
      userId,
      provider: dto.provider,
      amount: dto.amount,
      fee,
      chargeAmount: roundMoney(dto.amount + fee),
      testMode: gateway.testMode,
    });

    const adapter = ONLINE_ADAPTERS[dto.provider];
    const returnUrl = paymentReturnUrl(payment.id);
    try {
      const result = await adapter.createCheckout({
        payment: { id: payment.id, chargeAmount: toNumber(payment.chargeAmount), currency: payment.currency },
        user: { id: user.id, email: user.email, name: user.name, phone: user.phone },
        ip,
        gateway,
        returnUrl,
        cancelUrl: `${returnUrl}?iptal=1`,
        callbackUrl: `${env.publicApiUrl}/api/payments/webhooks/${adapter.slug}`,
      });
      const updated = await paymentRepository.update(payment.id, {
        providerRef: result.providerRef,
        checkoutUrl: result.redirectUrl ?? result.iframeUrl ?? null,
      });
      return { ...toView(updated), redirectUrl: result.redirectUrl ?? null, iframeUrl: result.iframeUrl ?? null };
    } catch (err) {
      await paymentRepository.transition(payment.id, ['PENDING'], 'FAILED', { failureReason: (err as Error).message.slice(0, 500) });
      throw err;
    }
  },

  /**
   * Sağlayıcıdan doğrulanmış sonucu uygular. Başarılı ödeme, yerelde süresi dolmuş
   * olsa bile (kripto onayları gecikebilir) bakiyeye yüklenir; tekrar gelen bildirimler etkisizdir.
   */
  async applyOutcome(payment: Payment, outcome: ProviderOutcome) {
    const gateway = await gatewayService.resolve(payment.provider);

    if (outcome.status === 'succeeded') {
      if (!amountMatches(payment, outcome.paidAmount, outcome.currency)) {
        const reason = `Tutar uyuşmazlığı: beklenen ${formatTRY(toNumber(payment.chargeAmount))}, bildirilen ${outcome.paidAmount} ${outcome.currency}`;
        logger.error(`[Payment] ${payment.id} ${reason}`);
        const moved = await paymentRepository.transition(payment.id, ['PENDING', 'EXPIRED'], 'FAILED', { failureReason: reason });
        if (moved) {
          await notificationService.notifyStaff({
            type: 'WALLET',
            title: 'Ödeme Tutarı Uyuşmuyor',
            message: `#${shortId(payment.id)} numaralı ${gateway.displayName} ödemesi incelenmeli. ${reason}`,
            link: '/panel/finans',
          });
        }
        return;
      }
      const amount = toNumber(payment.amount);
      const credited = await withTransaction(async (tx) => {
        const moved = await paymentRepository.transition(payment.id, ['PENDING', 'EXPIRED'], 'SUCCEEDED', { completedAt: new Date(), failureReason: null }, tx);
        if (!moved) return false;
        await walletRepository.credit(tx, {
          userId: payment.userId,
          amount,
          type: 'TOPUP',
          description: `${gateway.displayName} ile bakiye yükleme (#${shortId(payment.id)})`,
        });
        return true;
      });
      if (credited) {
        await notificationService.send({
          userId: payment.userId,
          type: 'WALLET',
          title: 'Bakiyeniz Yüklendi',
          message: `${gateway.displayName} ödemeniz onaylandı, ${formatTRY(amount)} bakiyenize eklendi.`,
          link: '/hesabim/cuzdan',
        });
      }
      return;
    }

    if (outcome.status === 'pending') {
      if (outcome.note && outcome.note !== payment.failureReason) {
        await paymentRepository.update(payment.id, { failureReason: outcome.note });
        await notificationService.notifyStaff({
          type: 'WALLET',
          title: 'Ödeme İnceleme Bekliyor',
          message: `#${shortId(payment.id)} numaralı ${gateway.displayName} ödemesi: ${outcome.note}`,
          link: '/panel/finans',
        });
      }
      return;
    }

    const status = outcome.status === 'failed' ? 'FAILED' : outcome.status === 'expired' ? 'EXPIRED' : 'CANCELLED';
    const moved = await paymentRepository.transition(payment.id, ['PENDING'], status, { failureReason: outcome.reason });
    if (moved && status === 'FAILED') {
      await notificationService.send({
        userId: payment.userId,
        type: 'WALLET',
        title: 'Ödemeniz Tamamlanamadı',
        message: `${formatTRY(toNumber(payment.chargeAmount))} tutarındaki ${gateway.displayName} ödemeniz başarısız oldu: ${outcome.reason}`,
        link: '/hesabim/cuzdan',
      });
    }
  },

  /** Webhook'u kaçırılan (ör. yerel geliştirme) ödemelerin sonucunu sağlayıcıdan sorgular */
  async sync(payment: Payment) {
    if (!payment.providerRef || (payment.status !== 'PENDING' && payment.status !== 'EXPIRED')) return;
    const gateway = await gatewayService.resolve(payment.provider);
    if (payment.provider === 'STRIPE' && gateway.secrets.secretKey) {
      const session = await stripeGateway.retrieveSession(gateway.secrets.secretKey, payment.providerRef);
      await this.applyOutcome(payment, stripeOutcome(session));
    } else if (payment.provider === 'IYZICO' && gateway.secrets.apiKey) {
      await this.applyOutcome(payment, await iyzicoGateway.retrieve(gateway, payment.providerRef, payment.id));
    }
  },

  // ─── Sağlayıcı bildirimleri ─────────────────────────────────────────────────

  async handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
    const gateway = await gatewayService.resolve('STRIPE');
    const secret = gateway.secrets.webhookSecret;
    if (!secret || !verifyStripeSignature(rawBody, signature, secret)) {
      throw new BadRequestError('Geçersiz Stripe imzası', 'INVALID_SIGNATURE');
    }
    const event = JSON.parse(rawBody.toString()) as StripeEvent;
    if (!event.type?.startsWith('checkout.session.')) return;
    const session = event.data.object;
    const paymentId = session.client_reference_id ?? session.metadata?.paymentId;
    const payment = paymentId ? await paymentRepository.findById(paymentId) : null;
    if (!payment || payment.provider !== 'STRIPE' || payment.providerRef !== session.id) {
      logger.warn(`[Stripe] Eşleşmeyen oturum bildirimi: ${session.id}`);
      return;
    }
    await this.applyOutcome(payment, stripeOutcome(session, event.type));
  },

  /** @returns hash geçerliyse true (PayTR'ye "OK" yanıtı verilir) */
  async handlePaytrCallback(body: PaytrCallback) {
    const gateway = await gatewayService.resolve('PAYTR');
    const { merchantKey, merchantSalt } = gateway.secrets;
    if (!merchantKey || !merchantSalt || !verifyPaytrCallback(body, merchantKey, merchantSalt)) return false;
    const payment = await paymentRepository.findByRef('PAYTR', body.merchant_oid!);
    if (!payment) {
      logger.warn(`[PayTR] Bilinmeyen sipariş bildirimi: ${body.merchant_oid}`);
      return true;
    }
    await this.applyOutcome(payment, paytrOutcome(body));
    return true;
  },

  /** iyzico, ödeme sonrası tarayıcıyı token ile buraya yönlendirir; sonuç API'den doğrulanır */
  async handleIyzicoCallback(token: string | undefined) {
    if (!token) return null;
    const payment = await paymentRepository.findByRef('IYZICO', token);
    if (!payment) return null;
    try {
      await this.sync(payment);
    } catch (err) {
      logger.error(`[iyzico] Ödeme doğrulanamadı: ${payment.id}`, err);
    }
    return payment.id;
  },

  async handleNowpaymentsIpn(body: NowpaymentsIpn, signature: string | undefined) {
    const gateway = await gatewayService.resolve('NOWPAYMENTS');
    const secret = gateway.secrets.ipnSecret;
    if (!secret || !verifyNowpaymentsIpn(body, signature, secret)) {
      throw new BadRequestError('Geçersiz NOWPayments imzası', 'INVALID_SIGNATURE');
    }
    const payment = body.order_id ? await paymentRepository.findById(body.order_id) : null;
    if (!payment || payment.provider !== 'NOWPAYMENTS' || (body.invoice_id && String(body.invoice_id) !== payment.providerRef)) {
      logger.warn(`[NOWPayments] Eşleşmeyen bildirim: ${body.order_id}`);
      return;
    }
    await this.applyOutcome(payment, nowpaymentsOutcome(body));
  },

  // ─── Sorgular ───────────────────────────────────────────────────────────────

  async getForUser(userId: string, id: string) {
    let payment = await paymentRepository.findById(id);
    if (!payment || payment.userId !== userId) throw new NotFoundError('Ödeme bulunamadı', 'PAYMENT_NOT_FOUND');
    if (payment.status === 'PENDING') {
      await this.sync(payment).catch((err) => logger.warn(`[Payment] Durum sorgulanamadı: ${id}`, err));
      payment = (await paymentRepository.findById(id))!;
    }
    return toView(payment);
  },

  async listMine(userId: string, page: PageParams) {
    const { items, total } = await paymentRepository.findByUser(userId, page);
    return { items: items.map(toView), total };
  },

  async listForAdmin(query: AdminPaymentListQuery) {
    const { items, total } = await paymentRepository.findForAdmin(query);
    return { items: items.map((p) => ({ ...toView(p), providerRef: p.providerRef, user: p.user })), total };
  },

  async adminSync(id: string) {
    const payment = await paymentRepository.findById(id);
    if (!payment) throw new NotFoundError('Ödeme bulunamadı', 'PAYMENT_NOT_FOUND');
    if (payment.provider !== 'STRIPE' && payment.provider !== 'IYZICO') {
      throw new BadRequestError('Bu sağlayıcının ödemeleri yalnızca bildirimle güncellenir', 'SYNC_UNSUPPORTED');
    }
    await this.sync(payment);
    return toView((await paymentRepository.findById(id))!);
  },

  /** Zamanlanmış iş: tamamlanmayan ödemeleri zaman aşımına düşürür */
  async expireStale() {
    const now = Date.now();
    const cards = await paymentRepository.expireStale(new Date(now - PENDING_PAYMENT_TTL_MINUTES * 60_000), ['STRIPE', 'PAYTR', 'IYZICO']);
    const crypto = await paymentRepository.expireStale(new Date(now - PENDING_CRYPTO_TTL_MINUTES * 60_000), ['NOWPAYMENTS']);
    return cards + crypto;
  },
};
