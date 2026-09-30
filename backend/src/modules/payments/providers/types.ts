import { ResolvedGateway } from '../payment.types';

export interface CheckoutContext {
  payment: { id: string; chargeAmount: number; currency: string };
  user: { id: string; email: string; name: string; phone: string | null };
  ip: string;
  gateway: ResolvedGateway;
  /** Ödemeden sonra kullanıcının döneceği frontend sayfası */
  returnUrl: string;
  cancelUrl: string;
  /** Sağlayıcının sonucu bildireceği backend adresi */
  callbackUrl: string;
}

export interface CheckoutResult {
  providerRef: string;
  redirectUrl?: string;
  iframeUrl?: string;
}

/** Sağlayıcıdan doğrulanmış ödeme sonucu */
export type ProviderOutcome =
  | { status: 'succeeded'; paidAmount: number; currency: string }
  | { status: 'failed' | 'expired' | 'cancelled'; reason: string }
  | { status: 'pending'; note?: string };
