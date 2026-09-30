import crypto from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/config/prisma';
import { api, balanceOf, createUser } from './helpers';

afterAll(() => prisma.$disconnect());

const hmac = (algo: string, key: string, data: string, enc: 'hex' | 'base64' = 'hex') => crypto.createHmac(algo, key).update(data).digest(enc);

let admin: Awaited<ReturnType<typeof createUser>>;

const configure = (provider: string, body: object) => api().put(`/api/payments/admin/gateways/${provider}`).set('Cookie', admin.cookie).send(body);

/** Webhook testleri için sağlayıcıya gitmeden bekleyen ödeme kaydı açar */
async function pendingPayment(provider: 'STRIPE' | 'PAYTR' | 'NOWPAYMENTS', userId: string, amount: number, fee = 0, providerRef = crypto.randomUUID()) {
  return prisma.payment.create({ data: { userId, provider, amount, fee, chargeAmount: amount + fee, providerRef } });
}

beforeAll(async () => {
  admin = await createUser({ role: 'ADMIN' });
});

describe('Ödeme yöntemi yönetimi', () => {
  it('gizli anahtarlar maskelenir, eksik ayarla yöntem açılamaz, kullanıcıya yalnızca açık yöntemler görünür', async () => {
    const incomplete = await configure('STRIPE', { isEnabled: true, secrets: { secretKey: 'sk_test_1234567890' } });
    expect(incomplete.body.error.code).toBe('GATEWAY_INCOMPLETE');

    const saved = await configure('STRIPE', { isEnabled: true, feePercent: 2, secrets: { secretKey: 'sk_test_1234567890', webhookSecret: 'whsec_stripe_test' } });
    expect(saved.status).toBe(200);
    expect(saved.body.data.secrets).toEqual({ secretKey: '••••7890', webhookSecret: '••••test' });
    expect(JSON.stringify(saved.body)).not.toContain('sk_test_1234567890');
    expect(saved.body.data.webhookUrl).toMatch(/\/api\/payments\/webhooks\/stripe$/);

    const stored = await prisma.paymentGateway.findUniqueOrThrow({ where: { provider: 'STRIPE' } });
    expect(stored.secrets).not.toContain('sk_test');

    // Boş gönderilen gizli alan mevcut değeri korur
    await configure('STRIPE', { secrets: { secretKey: '' }, displayName: 'Kredi Kartı (Stripe)' });
    const list = await api().get('/api/payments/admin/gateways').set('Cookie', admin.cookie);
    expect(list.body.data.find((g: { provider: string }) => g.provider === 'STRIPE').secrets.secretKey).toBe('••••7890');

    const user = await createUser();
    const methods = await api().get('/api/payments/methods').set('Cookie', user.cookie);
    const stripe = methods.body.data.find((m: { provider: string }) => m.provider === 'STRIPE');
    expect(stripe).toMatchObject({ displayName: 'Kredi Kartı (Stripe)', kind: 'redirect', feePercent: 2 });
    expect(JSON.stringify(methods.body)).not.toContain('whsec');
    expect(methods.body.data.some((m: { provider: string }) => m.provider === 'IYZICO')).toBe(false);

    expect((await api().get('/api/payments/admin/gateways').set('Cookie', user.cookie)).status).toBe(403);
    expect(await prisma.auditLog.count({ where: { action: 'payment_gateway.update', targetId: 'STRIPE' } })).toBeGreaterThan(0);
  });

  it('kapalı veya manuel yöntemle online ödeme başlatılamaz', async () => {
    const user = await createUser();
    const res = await api().post('/api/payments/checkout').set('Cookie', user.cookie).send({ provider: 'IYZICO', amount: 100 });
    expect(res.body.error.code).toBe('PAYMENT_METHOD_UNAVAILABLE');
    const manual = await api().post('/api/payments/checkout').set('Cookie', user.cookie).send({ provider: 'BANK_TRANSFER', amount: 100 });
    expect(manual.body.error.code).toBe('PAYMENT_METHOD_UNAVAILABLE');
  });
});

describe('Stripe webhook', () => {
  const send = (event: object, secret = 'whsec_stripe_test') => {
    const body = JSON.stringify(event);
    const t = Math.floor(Date.now() / 1000);
    return api()
      .post('/api/payments/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', `t=${t},v1=${hmac('sha256', secret, `${t}.${body}`)}`)
      .send(body);
  };
  const completed = (paymentId: string, sessionId: string, amountTotal: number) => ({
    id: `evt_${sessionId}`,
    type: 'checkout.session.completed',
    data: { object: { id: sessionId, client_reference_id: paymentId, payment_status: 'paid', status: 'complete', amount_total: amountTotal, currency: 'try' } },
  });

  it('imzalı bildirim bakiyeyi bir kez yükler; tekrar gelen bildirim etkisizdir', async () => {
    const { user, cookie } = await createUser();
    const payment = await pendingPayment('STRIPE', user.id, 200, 4);

    const [a, b] = await Promise.all([send(completed(payment.id, payment.providerRef!, 20400)), send(completed(payment.id, payment.providerRef!, 20400))]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(await balanceOf(user.id)).toBe(200);

    const view = await api().get(`/api/payments/${payment.id}`).set('Cookie', cookie);
    expect(view.body.data).toMatchObject({ status: 'SUCCEEDED', amount: 200, fee: 4, chargeAmount: 204 });
    const ledger = await prisma.walletTransaction.findMany({ where: { userId: user.id } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0].type).toBe('TOPUP');
  });

  it('geçersiz imza reddedilir, tutar uyuşmazlığında bakiye yüklenmez', async () => {
    const { user } = await createUser();
    const payment = await pendingPayment('STRIPE', user.id, 100);

    expect((await send(completed(payment.id, payment.providerRef!, 10000), 'whsec_yanlis')).status).toBe(400);
    expect(await balanceOf(user.id)).toBe(0);

    await send(completed(payment.id, payment.providerRef!, 100));
    expect(await balanceOf(user.id)).toBe(0);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('FAILED');
  });

  it('yerelde süresi dolmuş ödemenin geç gelen başarı bildirimi yine yüklenir', async () => {
    const { user } = await createUser();
    const payment = await pendingPayment('STRIPE', user.id, 50);
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'EXPIRED' } });
    await send(completed(payment.id, payment.providerRef!, 5000));
    expect(await balanceOf(user.id)).toBe(50);
  });

  it('başkasının ödemesi görüntülenemez', async () => {
    const owner = await createUser();
    const other = await createUser();
    const payment = await pendingPayment('STRIPE', owner.user.id, 10);
    expect((await api().get(`/api/payments/${payment.id}`).set('Cookie', other.cookie)).status).toBe(404);
  });
});

describe('PayTR bildirimi', () => {
  const key = 'paytr-key';
  const salt = 'paytr-salt';

  beforeAll(async () => {
    const res = await configure('PAYTR', { isEnabled: true, settings: { merchantId: '123456' }, secrets: { merchantKey: key, merchantSalt: salt } });
    expect(res.status).toBe(200);
  });

  const notify = (fields: Record<string, string>) =>
    api()
      .post('/api/payments/webhooks/paytr')
      .type('form')
      .send({ ...fields, hash: hmac('sha256', key, `${fields.merchant_oid}${salt}${fields.status}${fields.total_amount}`, 'base64') });

  it('hash doğrulanınca "OK" döner ve bakiyeyi yükler; hatalı hash reddedilir', async () => {
    const { user } = await createUser();
    const payment = await pendingPayment('PAYTR', user.id, 150, 0, `NP${crypto.randomUUID().replace(/-/g, '')}`);
    const fields = { merchant_oid: payment.providerRef!, status: 'success', total_amount: '15000', payment_amount: '15000', currency: 'TL' };

    const bad = await api().post('/api/payments/webhooks/paytr').type('form').send({ ...fields, hash: 'bozuk' });
    expect(bad.status).toBe(400);
    expect(await balanceOf(user.id)).toBe(0);

    const ok = await notify(fields);
    expect(ok.text).toBe('OK');
    expect(await balanceOf(user.id)).toBe(150);
    expect((await notify(fields)).text).toBe('OK');
    expect(await balanceOf(user.id)).toBe(150);
  });

  it('başarısız ödeme bildirimi kaydı FAILED yapar', async () => {
    const { user } = await createUser();
    const payment = await pendingPayment('PAYTR', user.id, 80, 0, `NP${crypto.randomUUID().replace(/-/g, '')}`);
    await notify({ merchant_oid: payment.providerRef!, status: 'failed', total_amount: '8000', failed_reason_msg: 'Kart limiti yetersiz' });
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: 'FAILED', failureReason: 'Kart limiti yetersiz' });
  });
});

describe('NOWPayments IPN', () => {
  const secret = 'ipn-secret';
  beforeAll(async () => {
    expect((await configure('NOWPAYMENTS', { isEnabled: true, secrets: { apiKey: 'np-key', ipnSecret: secret } })).status).toBe(200);
  });

  it('onay beklerken yüklemez, finished olunca yükler', async () => {
    const { user } = await createUser();
    const payment = await pendingPayment('NOWPAYMENTS', user.id, 300, 0, '5077125051');
    const ipn = (status: string) => {
      const body = { invoice_id: 5077125051, order_id: payment.id, payment_status: status, price_amount: 300, price_currency: 'try' };
      const sorted = JSON.stringify(Object.fromEntries(Object.entries(body).sort(([a], [b]) => a.localeCompare(b))));
      return api().post('/api/payments/webhooks/nowpayments').set('x-nowpayments-sig', hmac('sha512', secret, sorted)).send(body);
    };
    expect((await ipn('confirming')).status).toBe(200);
    expect(await balanceOf(user.id)).toBe(0);
    await ipn('finished');
    expect(await balanceOf(user.id)).toBe(300);
  });
});

describe('Kripto (cüzdan adresi) ile yükleme', () => {
  beforeAll(async () => {
    const bad = await configure('CRYPTO_MANUAL', { isEnabled: true, settings: { wallets: 'bozuk satır' } });
    expect(bad.body.error.code).toBe('INVALID_WALLETS');
    const res = await configure('CRYPTO_MANUAL', { isEnabled: true, minAmount: 50, settings: { wallets: 'USDT | TRC20 | TXabc123\nBTC | Bitcoin | bc1qxyz' } });
    expect(res.status).toBe(200);
  });

  it('TX hash ile bildirilir, aynı işlem iki kez bildirilemez, admin onayıyla yüklenir', async () => {
    const { user, cookie } = await createUser();
    const methods = await api().get('/api/payments/methods').set('Cookie', cookie);
    expect(methods.body.data.find((m: { provider: string }) => m.provider === 'CRYPTO_MANUAL').wallets).toHaveLength(2);

    const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;
    const tooLow = await api().post('/api/deposits/crypto').set('Cookie', cookie).send({ amount: 20, network: 'USDT · TRC20', txHash });
    expect(tooLow.body.error.code).toBe('AMOUNT_OUT_OF_RANGE');
    const wrongNet = await api().post('/api/deposits/crypto').set('Cookie', cookie).send({ amount: 500, network: 'ETH · ERC20', txHash });
    expect(wrongNet.body.error.code).toBe('INVALID_NETWORK');

    const created = await api().post('/api/deposits/crypto').set('Cookie', cookie).send({ amount: 500, network: 'USDT · TRC20', txHash });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ method: 'CRYPTO', network: 'USDT · TRC20', txHash, senderName: null });

    const other = await createUser();
    const dup = await api().post('/api/deposits/crypto').set('Cookie', other.cookie).send({ amount: 500, network: 'USDT · TRC20', txHash });
    expect(dup.body.error.code).toBe('TX_ALREADY_SUBMITTED');

    await api().post(`/api/deposits/${created.body.data.id}/approve`).set('Cookie', admin.cookie).send({ approvedAmount: 495 });
    expect(await balanceOf(user.id)).toBe(495);
  });
});
