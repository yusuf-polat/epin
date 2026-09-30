import crypto from 'crypto';
import { safeEqual } from '@/utils/secretBox';
import { PaymentProviderError, requestJson } from './http';
import { CheckoutContext, CheckoutResult, ProviderOutcome } from './types';

const BASE = { live: 'https://api.nowpayments.io/v1', sandbox: 'https://api-sandbox.nowpayments.io/v1' };

/** NOWPayments imzası için anahtarları (iç içe) alfabetik sıralar */
function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return Object.keys(source)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortDeep(source[key]);
        return acc;
      }, {});
  }
  return value;
}

/** x-nowpayments-sig = HMAC-SHA512(JSON(sıralı gövde), IPN secret) */
export function nowpaymentsSignature(body: object, ipnSecret: string) {
  return crypto.createHmac('sha512', ipnSecret).update(JSON.stringify(sortDeep(body))).digest('hex');
}

export const verifyNowpaymentsIpn = (body: object, header: string | undefined, ipnSecret: string) =>
  !!header && safeEqual(header, nowpaymentsSignature(body, ipnSecret));

export interface NowpaymentsIpn {
  payment_id?: number | string;
  invoice_id?: number | string;
  payment_status?: string;
  order_id?: string;
  price_amount?: number | string;
  price_currency?: string;
  actually_paid?: number | string;
  pay_currency?: string;
}

export function nowpaymentsOutcome(ipn: NowpaymentsIpn): ProviderOutcome {
  switch (ipn.payment_status) {
    case 'finished':
      return { status: 'succeeded', paidAmount: Number(ipn.price_amount ?? 0), currency: (ipn.price_currency ?? '').toUpperCase() };
    case 'failed':
      return { status: 'failed', reason: 'Kripto ödeme başarısız oldu' };
    case 'refunded':
      return { status: 'failed', reason: 'Kripto ödeme iade edildi' };
    case 'expired':
      return { status: 'expired', reason: 'Kripto ödeme süresi doldu' };
    case 'partially_paid':
      return { status: 'pending', note: `Eksik ödeme: ${ipn.actually_paid ?? '?'} ${ipn.pay_currency?.toUpperCase() ?? ''}`.trim() };
    default:
      // waiting, confirming, confirmed, sending: ağ onayı bekleniyor
      return { status: 'pending' };
  }
}

export const nowpaymentsGateway = {
  async createCheckout(ctx: CheckoutContext): Promise<CheckoutResult> {
    const base = ctx.gateway.testMode ? BASE.sandbox : BASE.live;
    const { status, body } = await requestJson<{ id?: number | string; invoice_url?: string; message?: string }>('NOWPayments', `${base}/invoice`, {
      method: 'POST',
      headers: { 'x-api-key': ctx.gateway.secrets.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price_amount: ctx.payment.chargeAmount,
        price_currency: ctx.payment.currency.toLowerCase(),
        order_id: ctx.payment.id,
        order_description: 'NexusPin cüzdan bakiyesi',
        ipn_callback_url: ctx.callbackUrl,
        success_url: ctx.returnUrl,
        cancel_url: ctx.cancelUrl,
      }),
    });
    if (status >= 400 || !body.id || !body.invoice_url) throw new PaymentProviderError(`NOWPayments: ${body.message ?? 'Ödeme faturası oluşturulamadı'}`);
    return { providerRef: String(body.id), redirectUrl: body.invoice_url };
  },
};
