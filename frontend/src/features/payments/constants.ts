import type { StatusStyle } from '@/types/common';
import type { CryptoWallet, PaymentProvider, PaymentStatus } from './types';

export const paymentKeys = {
  all: ['payments'] as const,
  methods: () => [...paymentKeys.all, 'methods'] as const,
  detail: (id: string) => [...paymentKeys.all, 'detail', id] as const,
  mine: (page: number) => [...paymentKeys.all, 'mine', page] as const,
  gateways: () => [...paymentKeys.all, 'gateways'] as const,
  admin: (params: object) => [...paymentKeys.all, 'admin', params] as const,
};

export const PROVIDER_META: Record<PaymentProvider, { icon: string; label: string }> = {
  PAYTR: { icon: 'credit_card', label: 'PayTR' },
  IYZICO: { icon: 'credit_score', label: 'iyzico' },
  STRIPE: { icon: 'payments', label: 'Stripe' },
  NOWPAYMENTS: { icon: 'currency_bitcoin', label: 'NOWPayments' },
  BANK_TRANSFER: { icon: 'account_balance', label: 'Havale / EFT' },
  CRYPTO_MANUAL: { icon: 'wallet', label: 'Kripto (Adres)' },
};

const PENDING_STYLE = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
const OK_STYLE = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
const BAD_STYLE = 'bg-rose-500/10 text-rose-300 border-rose-500/30';
const MUTED_STYLE = 'bg-slate-500/10 text-slate-300 border-slate-500/30';

export const PAYMENT_STATUS: Record<PaymentStatus, StatusStyle> = {
  PENDING: { label: 'Bekliyor', className: PENDING_STYLE },
  SUCCEEDED: { label: 'Yüklendi', className: OK_STYLE },
  FAILED: { label: 'Başarısız', className: BAD_STYLE },
  CANCELLED: { label: 'İptal', className: MUTED_STYLE },
  EXPIRED: { label: 'Süresi Doldu', className: MUTED_STYLE },
};

/** Ödeme sonucu sayfası bu süre boyunca durumu yeniler */
export const PAYMENT_POLL_MS = 3000;
export const PAYMENT_POLL_LIMIT_MS = 10 * 60_000;

export const walletLabel = (w: Pick<CryptoWallet, 'asset' | 'network'>) => `${w.asset} · ${w.network}`;

/** Hizmet bedeli (backend ile aynı formül): tutar × yüzde + sabit, kuruşa yuvarlanır */
export const calculateFee = (amount: number, m: { feePercent: number; feeFixed: number }) =>
  Math.round(((amount * m.feePercent) / 100 + m.feeFixed) * 100) / 100;

export function feeLabel(m: { feePercent: number; feeFixed: number }) {
  if (!m.feePercent && !m.feeFixed) return 'Ücretsiz';
  const parts = [m.feePercent ? `%${m.feePercent}` : null, m.feeFixed ? `₺${m.feeFixed.toFixed(2)}` : null].filter(Boolean);
  return `Hizmet bedeli ${parts.join(' + ')}`;
}
