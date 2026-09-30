import crypto from 'crypto';
import { PaymentProviderError, requestJson } from './http';
import { CheckoutContext, CheckoutResult, ProviderOutcome } from './types';

const BASE = { live: 'https://api.iyzipay.com', sandbox: 'https://sandbox-api.iyzipay.com' };
const INIT_PATH = '/payment/iyzipos/checkoutform/initialize/auth/ecom';
const DETAIL_PATH = '/payment/iyzipos/checkoutform/auth/ecom/detail';

type IyzicoCredentials = { testMode: boolean; secrets: Record<string, string> };

const baseUrl = (testMode: boolean) => (testMode ? BASE.sandbox : BASE.live);

/** iyzico fiyatları ondalık metin bekler: 100 → "100.0", 100.5 → "100.5" */
export const iyzicoPrice = (amount: number) => {
  const fixed = amount.toFixed(2).replace(/0+$/, '');
  return fixed.endsWith('.') ? `${fixed}0` : fixed;
};

/** IYZWSv2: HMAC-SHA256(secretKey, randomKey + uriPath + body) → base64("apiKey:..&randomKey:..&signature:..") */
export function iyzicoAuthHeaders(
  apiKey: string,
  secretKey: string,
  uriPath: string,
  body: string,
  randomKey = `${Date.now()}${crypto.randomBytes(4).toString('hex')}`
) {
  const signature = crypto.createHmac('sha256', secretKey).update(randomKey + uriPath + body).digest('hex');
  const authorization = Buffer.from(`apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`).toString('base64');
  return { Authorization: `IYZWSv2 ${authorization}`, 'x-iyzi-rnd': randomKey, 'Content-Type': 'application/json' };
}

export interface IyzicoResponse {
  status: 'success' | 'failure';
  errorMessage?: string;
  token?: string;
  paymentPageUrl?: string;
  paymentStatus?: string;
  paidPrice?: number | string;
  currency?: string;
  basketId?: string;
  fraudStatus?: number;
}

async function call(credentials: IyzicoCredentials, path: string, payload: object) {
  const body = JSON.stringify(payload);
  const { body: res } = await requestJson<IyzicoResponse>('iyzico', `${baseUrl(credentials.testMode)}${path}`, {
    method: 'POST',
    headers: iyzicoAuthHeaders(credentials.secrets.apiKey, credentials.secrets.secretKey, path, body),
    body,
  });
  return res;
}

export function iyzicoOutcome(res: IyzicoResponse, paymentId: string): ProviderOutcome {
  if (res.status !== 'success') return { status: 'failed', reason: res.errorMessage || 'Ödeme doğrulanamadı' };
  if (res.basketId && res.basketId !== paymentId) return { status: 'failed', reason: 'Ödeme kaydı eşleşmedi' };
  if (res.paymentStatus === 'SUCCESS') {
    if (res.fraudStatus === -1) return { status: 'failed', reason: 'Ödeme güvenlik kontrolünden geçemedi' };
    if (res.fraudStatus === 0) return { status: 'pending', note: 'Ödeme iyzico tarafından inceleniyor' };
    return { status: 'succeeded', paidAmount: Number(res.paidPrice ?? 0), currency: res.currency ?? 'TRY' };
  }
  if (res.paymentStatus === 'FAILURE') return { status: 'failed', reason: res.errorMessage || 'Ödeme reddedildi' };
  return { status: 'pending' };
}

export const iyzicoGateway = {
  async createCheckout(ctx: CheckoutContext): Promise<CheckoutResult> {
    const price = iyzicoPrice(ctx.payment.chargeAmount);
    const [name, ...rest] = ctx.user.name.trim().split(/\s+/);
    const surname = rest.join(' ') || name;
    const address = { contactName: ctx.user.name, city: 'Istanbul', country: 'Turkey', address: 'Dijital teslimat' };
    const res = await call(ctx.gateway, INIT_PATH, {
      locale: 'tr',
      conversationId: ctx.payment.id,
      price,
      paidPrice: price,
      currency: 'TRY',
      basketId: ctx.payment.id,
      paymentGroup: 'PRODUCT',
      callbackUrl: ctx.callbackUrl,
      enabledInstallments: [1],
      buyer: {
        id: ctx.user.id,
        name,
        surname,
        // Kimlik numarası toplanmadığında iyzico'nun kabul ettiği varsayılan değer
        identityNumber: '11111111111',
        email: ctx.user.email,
        gsmNumber: ctx.user.phone || undefined,
        registrationAddress: address.address,
        city: address.city,
        country: address.country,
        ip: ctx.ip,
      },
      billingAddress: address,
      basketItems: [{ id: ctx.payment.id, name: 'Cüzdan Bakiyesi', category1: 'Dijital', itemType: 'VIRTUAL', price }],
    });
    if (res.status !== 'success' || !res.token || !res.paymentPageUrl) {
      throw new PaymentProviderError(`iyzico: ${res.errorMessage ?? 'Ödeme formu oluşturulamadı'}`);
    }
    return { providerRef: res.token, redirectUrl: res.paymentPageUrl };
  },

  /** Callback'teki token ile ödemenin gerçek sonucunu iyzico'dan sorgular */
  async retrieve(credentials: IyzicoCredentials, token: string, paymentId: string) {
    const res = await call(credentials, DETAIL_PATH, { locale: 'tr', conversationId: paymentId, token });
    return iyzicoOutcome(res, paymentId);
  },
};
