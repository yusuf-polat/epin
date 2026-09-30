import crypto from 'crypto';
import { safeEqual } from '@/utils/secretBox';
import { fromMinor, PaymentProviderError, requestJson, toMinor } from './http';
import { CheckoutContext, CheckoutResult, ProviderOutcome } from './types';

const API = 'https://api.stripe.com/v1';
/** İmzalı webhook'un kabul edileceği azami yaş (Stripe önerisi) */
const SIGNATURE_TOLERANCE_SECONDS = 300;

export interface StripeSession {
  id: string;
  url?: string | null;
  status?: 'open' | 'complete' | 'expired';
  payment_status?: 'paid' | 'unpaid' | 'no_payment_required';
  amount_total?: number | null;
  currency?: string | null;
  client_reference_id?: string | null;
  metadata?: Record<string, string>;
}

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: StripeSession };
}

type StripeError = { error?: { message: string } };

const auth = (secretKey: string) => ({ Authorization: `Bearer ${secretKey}` });

/** Stripe-Signature başlığını doğrular (t=zaman, v1=HMAC-SHA256("t.payload")) */
export function verifyStripeSignature(rawBody: Buffer | string, header: string | undefined, secret: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!header) return false;
  const parts = header.split(',').map((p) => p.trim().split('='));
  const timestamp = parts.find(([k]) => k === 't')?.[1];
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody.toString()}`).digest('hex');
  return signatures.some((s) => safeEqual(s, expected));
}

export function stripeOutcome(session: StripeSession, eventType?: string): ProviderOutcome {
  if (eventType === 'checkout.session.async_payment_failed') return { status: 'failed', reason: 'Ödeme banka tarafından onaylanmadı' };
  if (session.status === 'expired' || eventType === 'checkout.session.expired') return { status: 'expired', reason: 'Ödeme sayfasının süresi doldu' };
  if (session.payment_status === 'paid') {
    return { status: 'succeeded', paidAmount: fromMinor(session.amount_total ?? 0), currency: (session.currency ?? '').toUpperCase() };
  }
  return { status: 'pending' };
}

export const stripeGateway = {
  async createCheckout(ctx: CheckoutContext): Promise<CheckoutResult> {
    const form = new URLSearchParams({
      mode: 'payment',
      success_url: ctx.returnUrl,
      cancel_url: ctx.cancelUrl,
      client_reference_id: ctx.payment.id,
      customer_email: ctx.user.email,
      locale: 'tr',
      'metadata[paymentId]': ctx.payment.id,
      'payment_intent_data[metadata][paymentId]': ctx.payment.id,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': ctx.payment.currency.toLowerCase(),
      'line_items[0][price_data][unit_amount]': String(toMinor(ctx.payment.chargeAmount)),
      'line_items[0][price_data][product_data][name]': 'Cüzdan Bakiyesi',
      expires_at: String(Math.floor(Date.now() / 1000) + 60 * 60),
    });
    const { status, body } = await requestJson<StripeSession & StripeError>('Stripe', `${API}/checkout/sessions`, {
      method: 'POST',
      headers: { ...auth(ctx.gateway.secrets.secretKey), 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': ctx.payment.id },
      body: form,
    });
    if (status >= 400 || !body.url) throw new PaymentProviderError(`Stripe: ${body.error?.message ?? 'Ödeme oturumu oluşturulamadı'}`);
    return { providerRef: body.id, redirectUrl: body.url };
  },

  async retrieveSession(secretKey: string, sessionId: string) {
    const { status, body } = await requestJson<StripeSession & StripeError>('Stripe', `${API}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: auth(secretKey),
    });
    if (status >= 400) throw new PaymentProviderError(`Stripe: ${body.error?.message ?? 'Ödeme sorgulanamadı'}`);
    return body;
  },
};
