import crypto from 'crypto';
import { DepositRequest, PaymentProvider, Prisma } from '@prisma/client';
import { withTransaction } from '@/database/transaction';
import { BadRequestError, ConflictError, NotFoundError } from '@/utils/errors';
import { formatTRY, toNullableNumber, toNumber } from '@/utils/money';
import { PageParams } from '@/utils/pagination';
import { walletRepository } from '@/modules/wallet/wallet.repository';
import { notificationService } from '@/modules/notifications/notification.service';
import { gatewayService, parseCryptoWallets, walletLabel } from '@/modules/payments/gateway.service';
import { ResolvedGateway } from '@/modules/payments/payment.types';
import { depositRepository } from './deposit.repository';
import { AdminDepositListQuery, CreateCryptoDepositDTO, CreateDepositDTO } from './deposit.types';
import { MAX_PENDING_DEPOSITS, REFERENCE_ALPHABET, REFERENCE_LENGTH, REFERENCE_PREFIX } from './deposit.constants';

const toView = <T extends DepositRequest>(d: T) => ({ ...d, amount: toNumber(d.amount), approvedAmount: toNullableNumber(d.approvedAmount) });

const methodLabel = (d: Pick<DepositRequest, 'method'>) => (d.method === 'CRYPTO' ? 'Kripto' : 'Havale/EFT');

/** Havale açıklamasına yazılacak, kolay okunur benzersiz kod (ör. NP-7KQ2MX9A) */
export function generateReferenceCode(): string {
  const bytes = crypto.randomBytes(REFERENCE_LENGTH);
  const body = Array.from(bytes, (b) => REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length]).join('');
  return `${REFERENCE_PREFIX}-${body}`;
}

async function usableGateway(provider: PaymentProvider, disabledMessage: string): Promise<ResolvedGateway> {
  const gateway = await gatewayService.resolve(provider);
  if (!gatewayService.isUsable(gateway)) throw new BadRequestError(disabledMessage, 'DEPOSITS_DISABLED');
  return gateway;
}

function assertLimits(gateway: ResolvedGateway, amount: number) {
  if (amount < gateway.minAmount || amount > gateway.maxAmount) {
    throw new BadRequestError(`${formatTRY(gateway.minAmount)} - ${formatTRY(gateway.maxAmount)} arası yükleme yapılabilir`, 'AMOUNT_OUT_OF_RANGE');
  }
}

async function assertPendingLimit(userId: string) {
  if ((await depositRepository.countPending(userId)) >= MAX_PENDING_DEPOSITS) {
    throw new BadRequestError(`Aynı anda en fazla ${MAX_PENDING_DEPOSITS} bekleyen yükleme talebiniz olabilir`, 'TOO_MANY_PENDING');
  }
}

async function getPending(id: string) {
  const request = await depositRepository.findById(id);
  if (!request) throw new NotFoundError('Yükleme talebi bulunamadı', 'DEPOSIT_NOT_FOUND');
  if (request.status !== 'PENDING') throw new ConflictError('Bu talep zaten sonuçlandırılmış', 'DEPOSIT_PROCESSED');
  return request;
}

/**
 * Yönetici onaylı bakiye yükleme: Havale/EFT (referans kodlu) ve kripto (TX hash bildirimli).
 * Hesap ve cüzdan bilgileri admin panelindeki ödeme yöntemi ayarlarından gelir.
 */
export const depositService = {
  async getBankInfo() {
    const account = await gatewayService.getBankAccount();
    if (!account) throw new BadRequestError('Havale/EFT ile bakiye yükleme şu anda kullanılamıyor', 'DEPOSITS_DISABLED');
    return account;
  },

  async create(userId: string, dto: CreateDepositDTO) {
    const gateway = await usableGateway('BANK_TRANSFER', 'Havale/EFT ile bakiye yükleme şu anda kullanılamıyor');
    assertLimits(gateway, dto.amount);
    await assertPendingLimit(userId);

    const request = await depositRepository.createWithReference(
      { userId, method: 'HAVALE_EFT', amount: dto.amount, senderName: dto.senderName },
      generateReferenceCode
    );
    await notificationService.notifyStaff({
      type: 'WALLET',
      title: 'Yeni Havale/EFT Bildirimi',
      message: `${formatTRY(dto.amount)} tutarında yükleme talebi (${request.referenceCode}) onay bekliyor.`,
      link: '/panel/finans',
    });
    return { ...toView(request), bankAccount: await this.getBankInfo() };
  },

  async createCrypto(userId: string, dto: CreateCryptoDepositDTO) {
    const gateway = await usableGateway('CRYPTO_MANUAL', 'Kripto ile bakiye yükleme şu anda kullanılamıyor');
    const wallet = parseCryptoWallets(gateway.settings.wallets).find((w) => walletLabel(w) === dto.network);
    if (!wallet) throw new BadRequestError('Seçilen kripto ağı kullanılamıyor', 'INVALID_NETWORK');
    assertLimits(gateway, dto.amount);
    await assertPendingLimit(userId);
    if (await depositRepository.findByTxHash(dto.txHash)) {
      throw new ConflictError('Bu işlem özeti (TX hash) daha önce bildirilmiş', 'TX_ALREADY_SUBMITTED');
    }

    const request = await depositRepository
      .createWithReference({ userId, method: 'CRYPTO', amount: dto.amount, network: walletLabel(wallet), txHash: dto.txHash }, generateReferenceCode)
      .catch((err) => {
        // Aynı TX hash'in eşzamanlı iki kez bildirilmesi
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new ConflictError('Bu işlem özeti (TX hash) daha önce bildirilmiş', 'TX_ALREADY_SUBMITTED');
        }
        throw err;
      });
    await notificationService.notifyStaff({
      type: 'WALLET',
      title: 'Yeni Kripto Yükleme Bildirimi',
      message: `${wallet.asset} (${wallet.network}) ile ${formatTRY(dto.amount)} tutarında yükleme bildirildi (${request.referenceCode}).`,
      link: '/panel/finans',
    });
    return toView(request);
  },

  async listMine(userId: string, page: PageParams) {
    const { items, total } = await depositRepository.findByUser(userId, page);
    return { items: items.map(({ user: _user, ...d }) => toView(d)), total };
  },

  async cancel(userId: string, id: string) {
    const request = await getPending(id);
    if (request.userId !== userId) throw new NotFoundError('Yükleme talebi bulunamadı', 'DEPOSIT_NOT_FOUND');
    const moved = await depositRepository.transitionFromPending(id, 'CANCELLED', { adminNote: 'Kullanıcı tarafından iptal edildi' });
    if (!moved) throw new ConflictError('Bu talep zaten sonuçlandırılmış', 'DEPOSIT_PROCESSED');
    return { id, status: 'CANCELLED' as const };
  },

  // ─── Yönetim ────────────────────────────────────────────────────────────────

  async listForAdmin(query: AdminDepositListQuery) {
    const { items, total } = await depositRepository.findForAdmin(query);
    return { items: items.map(toView), total };
  },

  async approve(adminId: string, id: string, approvedAmount?: number) {
    const request = await getPending(id);
    const amount = approvedAmount ?? toNumber(request.amount);

    await withTransaction(async (tx) => {
      const moved = await depositRepository.transitionFromPending(
        id,
        'APPROVED',
        { approvedAmount: amount, processedById: adminId, processedAt: new Date() },
        tx
      );
      if (!moved) throw new ConflictError('Bu talep zaten sonuçlandırılmış', 'DEPOSIT_PROCESSED');
      await walletRepository.credit(tx, {
        userId: request.userId,
        amount,
        type: 'TOPUP',
        description: `${methodLabel(request)} ile bakiye yükleme (${request.referenceCode})`,
      });
    });

    await notificationService.send({
      userId: request.userId,
      type: 'WALLET',
      title: 'Bakiyeniz Yüklendi',
      message: `${request.referenceCode} referanslı ${methodLabel(request)} yüklemeniz onaylandı, ${formatTRY(amount)} bakiyenize eklendi.`,
      link: '/hesabim/cuzdan',
    });
    return { id, status: 'APPROVED' as const, approvedAmount: amount };
  },

  async reject(adminId: string, id: string, reason: string) {
    const request = await getPending(id);
    const moved = await depositRepository.transitionFromPending(id, 'REJECTED', { adminNote: reason, processedById: adminId, processedAt: new Date() });
    if (!moved) throw new ConflictError('Bu talep zaten sonuçlandırılmış', 'DEPOSIT_PROCESSED');
    await notificationService.send({
      userId: request.userId,
      type: 'WALLET',
      title: 'Yükleme Talebiniz Reddedildi',
      message: `${request.referenceCode} referanslı talebiniz onaylanmadı. Gerekçe: ${reason}`,
      link: '/hesabim/cuzdan',
    });
    return { id, status: 'REJECTED' as const };
  },
};
