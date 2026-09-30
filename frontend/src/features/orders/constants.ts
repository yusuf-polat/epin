import type { StatusStyle } from '@/types/common';
import type { AdminOrderParams, EscrowStatus } from './types';

export const orderKeys = {
  all: ['orders'] as const,
  mine: () => [...orderKeys.all, 'mine'] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
  sales: (filter: 'pending' | 'all', page: number) => [...orderKeys.all, 'sales', filter, page] as const,
  mineList: (page: number) => [...orderKeys.all, 'mine', page] as const,
  admin: (params: AdminOrderParams) => [...orderKeys.all, 'admin', params] as const,
};

export const ESCROW_LABELS: Record<EscrowStatus, StatusStyle> = {
  HELD_IN_ESCROW: { label: 'Güvenli Havuzda', className: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  RELEASED_TO_SELLER: { label: 'Tamamlandı', className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  DISPUTED: { label: 'İtirazda', className: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  REFUNDED_TO_BUYER: { label: 'İade Edildi', className: 'bg-sky-500/10 text-sky-300 border-sky-500/30' },
  REPLACED: { label: 'Değişim Yapıldı', className: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
};
