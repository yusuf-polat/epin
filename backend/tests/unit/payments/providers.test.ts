import crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import { stripeOutcome, verifyStripeSignature } from '@/modules/payments/providers/stripe';
import { paytrMerchantOid, paytrOutcome, paytrToken, verifyPaytrCallback } from '@/modules/payments/providers/paytr';
import { iyzicoAuthHeaders, iyzicoOutcome, iyzicoPrice } from '@/modules/payments/providers/iyzico';
import { nowpaymentsOutcome, nowpaymentsSignature, verifyNowpaymentsIpn } from '@/modules/payments/providers/nowpayments';
import { calculateFee, missingFields, parseCryptoWallets } from '@/modules/payments/gateway.service';
import { amountMatches } from '@/modules/payments/payment.service';
import { Prisma } from '@prisma/client';
import { decryptJson, encryptJson } from '@/utils/secretBox';

const hmac = (algo: string, key: string, data: string, enc: 'hex' | 'base64' = 'hex') => crypto.createHmac(algo, key).update(data).digest(enc);

describe('Stripe webhook imzası', () => {
  const secret = 'whsec_test';
  const payload = '{"id":"evt_1","type":"checkout.session.completed"}';
  const now = 1_700_000_000;
  const header = (t: number, body = payload) => `t=${t},v1=${hmac('sha256', secret, `${t}.${body}`)}`;

  it('geçerli imzayı kabul eder', () => expect(verifyStripeSignature(payload, header(now), secret, now)).toBe(true));
  it('değiştirilmiş gövdeyi reddeder', () => expect(verifyStripeSignature(payload.replace('evt_1', 'evt_2'), header(now), secret, now)).toBe(false));
  it('5 dakikadan eski imzayı reddeder (tekrar oynatma)', () => expect(verifyStripeSignature(payload, header(now - 301), secret, now)).toBe(false));
  it('başlık yoksa reddeder', () => expect(verifyStripeSignature(payload, undefined, secret, now)).toBe(false));

  it('ödenmiş oturumu kuruştan TL tutarına çevirir', () => {
    expect(stripeOutcome({ id: 'cs', payment_status: 'paid', amount_total: 25050, currency: 'try' })).toEqual({ status: 'succeeded', paidAmount: 250.5, currency: 'TRY' });
    expect(stripeOutcome({ id: 'cs', status: 'expired' }).status).toBe('expired');
    expect(stripeOutcome({ id: 'cs', payment_status: 'unpaid' }, 'checkout.session.async_payment_failed').status).toBe('failed');
    expect(stripeOutcome({ id: 'cs', payment_status: 'unpaid', status: 'open' }).status).toBe('pending');
  });
});

describe('PayTR', () => {
  const key = 'KEY123';
  const salt = 'SALT456';

  it('sipariş numarası yalnızca harf ve rakamdan oluşur', () => {
    expect(paytrMerchantOid('1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed')).toBe('NP1b9d6bcdbbfd4b2d9b5dab8dfbbd4bed');
  });

  it('token hash alanları dokümandaki sırayla birleştirir', () => {
    const f = {
      merchantId: '100',
      userIp: '1.2.3.4',
      merchantOid: 'NP1',
      email: 'a@b.c',
      paymentAmount: 10000,
      userBasket: 'W10=',
      noInstallment: '1',
      maxInstallment: '0',
      currency: 'TL',
      testMode: '1',
    };
    expect(paytrToken(f, key, salt)).toBe(hmac('sha256', key, '1001.2.3.4NP1a@b.c10000W10=10TL1' + salt, 'base64'));
  });

  it('bildirim hash doğrulaması', () => {
    const body = { merchant_oid: 'NP1', status: 'success', total_amount: '10000', payment_amount: '10000' };
    const hash = hmac('sha256', key, `NP1${salt}success10000`, 'base64');
    expect(verifyPaytrCallback({ ...body, hash }, key, salt)).toBe(true);
    expect(verifyPaytrCallback({ ...body, total_amount: '1', hash }, key, salt)).toBe(false);
    expect(verifyPaytrCallback({ ...body, hash: undefined }, key, salt)).toBe(false);
  });

  it('sonuç: taksit farkı yerine sipariş tutarı (payment_amount) esas alınır', () => {
    expect(paytrOutcome({ status: 'success', total_amount: '10500', payment_amount: '10000', currency: 'TL' })).toEqual({ status: 'succeeded', paidAmount: 100, currency: 'TRY' });
    expect(paytrOutcome({ status: 'failed', failed_reason_msg: 'Yetersiz bakiye' })).toEqual({ status: 'failed', reason: 'Yetersiz bakiye' });
  });
});

describe('iyzico', () => {
  it('fiyatı iyzico biçimine çevirir', () => {
    expect(iyzicoPrice(100)).toBe('100.0');
    expect(iyzicoPrice(100.5)).toBe('100.5');
    expect(iyzicoPrice(99.99)).toBe('99.99');
  });

  it('IYZWSv2 yetkilendirme başlığı', () => {
    const headers = iyzicoAuthHeaders('api', 'secret', '/path', '{"a":1}', 'rnd');
    const signature = hmac('sha256', 'secret', 'rnd/path{"a":1}');
    expect(headers['x-iyzi-rnd']).toBe('rnd');
    expect(headers.Authorization).toBe(`IYZWSv2 ${Buffer.from(`apiKey:api&randomKey:rnd&signature:${signature}`).toString('base64')}`);
  });

  it('sonuç: başka sepete ait veya dolandırıcılık şüpheli ödemeyi kabul etmez', () => {
    expect(iyzicoOutcome({ status: 'success', paymentStatus: 'SUCCESS', paidPrice: '100.0', basketId: 'p1', fraudStatus: 1 }, 'p1')).toEqual({
      status: 'succeeded',
      paidAmount: 100,
      currency: 'TRY',
    });
    expect(iyzicoOutcome({ status: 'success', paymentStatus: 'SUCCESS', basketId: 'p2' }, 'p1').status).toBe('failed');
    expect(iyzicoOutcome({ status: 'success', paymentStatus: 'SUCCESS', basketId: 'p1', fraudStatus: -1 }, 'p1').status).toBe('failed');
    expect(iyzicoOutcome({ status: 'success', paymentStatus: 'SUCCESS', basketId: 'p1', fraudStatus: 0 }, 'p1').status).toBe('pending');
    expect(iyzicoOutcome({ status: 'failure', errorMessage: 'Kart reddedildi' }, 'p1')).toEqual({ status: 'failed', reason: 'Kart reddedildi' });
  });
});

describe('NOWPayments', () => {
  it('imza anahtar sırasından bağımsızdır (iç içe alanlar dahil)', () => {
    const a = { order_id: 'p1', payment_status: 'finished', fee: { currency: 'btc', depositFee: 1 } };
    const b = { fee: { depositFee: 1, currency: 'btc' }, payment_status: 'finished', order_id: 'p1' };
    expect(nowpaymentsSignature(a, 's')).toBe(nowpaymentsSignature(b, 's'));
    expect(nowpaymentsSignature(a, 's')).toBe(hmac('sha512', 's', '{"fee":{"currency":"btc","depositFee":1},"order_id":"p1","payment_status":"finished"}'));
    expect(verifyNowpaymentsIpn(a, nowpaymentsSignature(a, 's'), 's')).toBe(true);
    expect(verifyNowpaymentsIpn({ ...a, payment_status: 'failed' }, nowpaymentsSignature(a, 's'), 's')).toBe(false);
  });

  it('durumları eşler', () => {
    expect(nowpaymentsOutcome({ payment_status: 'finished', price_amount: 250, price_currency: 'try' })).toEqual({ status: 'succeeded', paidAmount: 250, currency: 'TRY' });
    expect(nowpaymentsOutcome({ payment_status: 'confirming' }).status).toBe('pending');
    expect(nowpaymentsOutcome({ payment_status: 'expired' }).status).toBe('expired');
    expect(nowpaymentsOutcome({ payment_status: 'partially_paid', actually_paid: 0.001, pay_currency: 'btc' })).toEqual({ status: 'pending', note: 'Eksik ödeme: 0.001 BTC' });
  });
});

describe('Ödeme yöntemi ayarları', () => {
  it('hizmet bedelini kuruşa yuvarlar', () => {
    expect(calculateFee(100, { feePercent: 2.49, feeFixed: 0.25 })).toBe(2.74);
    expect(calculateFee(333.33, { feePercent: 0, feeFixed: 0 })).toBe(0);
  });

  it('kripto cüzdan satırlarını ayrıştırır, hatalıları atlar', () => {
    expect(parseCryptoWallets('usdt | TRC20 | TX1\nhatalı satır\nBTC|Bitcoin|bc1q')).toEqual([
      { asset: 'USDT', network: 'TRC20', address: 'TX1' },
      { asset: 'BTC', network: 'Bitcoin', address: 'bc1q' },
    ]);
  });

  it('zorunlu alan eksikse listeler (gizli alanlar dahil)', () => {
    expect(missingFields({ provider: 'PAYTR', settings: { merchantId: '1' }, secrets: { merchantKey: 'k' } })).toEqual(['Mağaza gizli anahtar (merchant_salt)']);
    expect(missingFields({ provider: 'STRIPE', settings: {}, secrets: { secretKey: 'sk', webhookSecret: 'wh' } })).toEqual([]);
  });

  it('tahsil edilen tutar ve para birimi birebir eşleşmeli', () => {
    const payment = { chargeAmount: new Prisma.Decimal('102.50'), currency: 'TRY' };
    expect(amountMatches(payment, 102.5, 'try')).toBe(true);
    expect(amountMatches(payment, 102.49, 'TRY')).toBe(false);
    expect(amountMatches(payment, 102.5, 'USD')).toBe(false);
  });

  it('gizli anahtarlar şifrelenir ve geri çözülür', () => {
    const sealed = encryptJson({ secretKey: 'sk_live_123' });
    expect(sealed).not.toContain('sk_live_123');
    expect(decryptJson(sealed)).toEqual({ secretKey: 'sk_live_123' });
    const tampered = sealed.slice(0, -4) + (sealed.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    expect(() => decryptJson(tampered)).toThrow();
  });
});
