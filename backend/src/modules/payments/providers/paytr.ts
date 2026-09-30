import crypto from 'crypto';
import { safeEqual } from '@/utils/secretBox';
import { fromMinor, PaymentProviderError, requestJson, toMinor } from './http';
import { CheckoutContext, CheckoutResult, ProviderOutcome } from './types';

const TOKEN_URL = 'https://www.paytr.com/odeme/api/get-token';
const IFRAME_URL = 'https://www.paytr.com/odeme/guvenli/';

const hmacBase64 = (data: string, key: string) => crypto.createHmac('sha256', key).update(data).digest('base64');

/** PayTR sipariş numarası yalnızca harf ve rakam içerebilir */
export const paytrMerchantOid = (paymentId: string) => `NP${paymentId.replace(/-/g, '')}`;

export interface PaytrTokenFields {
  merchantId: string;
  userIp: string;
  merchantOid: string;
  email: string;
  paymentAmount: number;
  userBasket: string;
  noInstallment: string;
  maxInstallment: string;
  currency: string;
  testMode: string;
}

/** paytr_token = base64(HMAC-SHA256(alanlar + merchant_salt, merchant_key)) */
export function paytrToken(f: PaytrTokenFields, merchantKey: string, merchantSalt: string) {
  const hashStr = `${f.merchantId}${f.userIp}${f.merchantOid}${f.email}${f.paymentAmount}${f.userBasket}${f.noInstallment}${f.maxInstallment}${f.currency}${f.testMode}`;
  return hmacBase64(hashStr + merchantSalt, merchantKey);
}

export interface PaytrCallback {
  merchant_oid?: string;
  status?: string;
  total_amount?: string;
  payment_amount?: string;
  hash?: string;
  failed_reason_code?: string;
  failed_reason_msg?: string;
  currency?: string;
}

/** Bildirim hash'i: base64(HMAC-SHA256(merchant_oid + salt + status + total_amount, merchant_key)) */
export function verifyPaytrCallback(body: PaytrCallback, merchantKey: string, merchantSalt: string) {
  if (!body.merchant_oid || !body.status || !body.total_amount || !body.hash) return false;
  const expected = hmacBase64(`${body.merchant_oid}${merchantSalt}${body.status}${body.total_amount}`, merchantKey);
  return safeEqual(body.hash, expected);
}

export function paytrOutcome(body: PaytrCallback): ProviderOutcome {
  if (body.status === 'success') {
    // payment_amount sipariş tutarıdır; total_amount taksit farkını da içerebilir
    const currency = !body.currency || body.currency === 'TL' ? 'TRY' : body.currency;
    return { status: 'succeeded', paidAmount: fromMinor(body.payment_amount ?? body.total_amount ?? 0), currency };
  }
  return { status: 'failed', reason: body.failed_reason_msg || `Ödeme başarısız (kod ${body.failed_reason_code ?? '-'})` };
}

export const paytrGateway = {
  async createCheckout(ctx: CheckoutContext): Promise<CheckoutResult> {
    const { settings, secrets, testMode } = ctx.gateway;
    const merchantOid = paytrMerchantOid(ctx.payment.id);
    const paymentAmount = toMinor(ctx.payment.chargeAmount);
    const userBasket = Buffer.from(JSON.stringify([['Cüzdan Bakiyesi', ctx.payment.chargeAmount.toFixed(2), 1]])).toString('base64');
    const fields: PaytrTokenFields = {
      merchantId: settings.merchantId,
      userIp: ctx.ip,
      merchantOid,
      email: ctx.user.email,
      paymentAmount,
      userBasket,
      noInstallment: '1',
      maxInstallment: '0',
      currency: 'TL',
      testMode: testMode ? '1' : '0',
    };
    const form = new URLSearchParams({
      merchant_id: fields.merchantId,
      user_ip: fields.userIp,
      merchant_oid: merchantOid,
      email: fields.email,
      payment_amount: String(paymentAmount),
      paytr_token: paytrToken(fields, secrets.merchantKey, secrets.merchantSalt),
      user_basket: userBasket,
      debug_on: testMode ? '1' : '0',
      no_installment: fields.noInstallment,
      max_installment: fields.maxInstallment,
      user_name: ctx.user.name,
      // Dijital ürün satışında teslimat adresi yoktur; PayTR alanı zorunlu tutar
      user_address: 'Dijital teslimat',
      user_phone: ctx.user.phone || '0000000000',
      merchant_ok_url: ctx.returnUrl,
      merchant_fail_url: ctx.cancelUrl,
      timeout_limit: '30',
      currency: fields.currency,
      test_mode: fields.testMode,
      lang: 'tr',
    });
    const { body } = await requestJson<{ status: string; token?: string; reason?: string }>('PayTR', TOKEN_URL, { method: 'POST', body: form });
    if (body.status !== 'success' || !body.token) throw new PaymentProviderError(`PayTR: ${body.reason ?? 'Ödeme formu oluşturulamadı'}`);
    return { providerRef: merchantOid, iframeUrl: `${IFRAME_URL}${body.token}` };
  },
};
