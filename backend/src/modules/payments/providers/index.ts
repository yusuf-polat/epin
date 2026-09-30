import { PaymentProvider } from '@prisma/client';
import { iyzicoGateway } from './iyzico';
import { nowpaymentsGateway } from './nowpayments';
import { paytrGateway } from './paytr';
import { stripeGateway } from './stripe';
import { CheckoutContext, CheckoutResult } from './types';

export type OnlineProvider = 'STRIPE' | 'PAYTR' | 'IYZICO' | 'NOWPAYMENTS';

interface OnlineAdapter {
  /** Bildirim adresinin yolu: /api/payments/webhooks/<slug> */
  slug: string;
  createCheckout(ctx: CheckoutContext): Promise<CheckoutResult>;
}

export const ONLINE_ADAPTERS: Record<OnlineProvider, OnlineAdapter> = {
  STRIPE: { slug: 'stripe', createCheckout: stripeGateway.createCheckout },
  PAYTR: { slug: 'paytr', createCheckout: paytrGateway.createCheckout },
  IYZICO: { slug: 'iyzico', createCheckout: iyzicoGateway.createCheckout },
  NOWPAYMENTS: { slug: 'nowpayments', createCheckout: nowpaymentsGateway.createCheckout },
};

export const isOnlineProvider = (p: PaymentProvider): p is OnlineProvider => p in ONLINE_ADAPTERS;
