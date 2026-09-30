import type { StatusStyle } from '@/types/common';
import type { SellerRequestStatus } from './types';

export const sellerRequestKeys = {
  all: ['seller-requests'] as const,
  mine: () => [...sellerRequestKeys.all, 'mine'] as const,
  admin: () => [...sellerRequestKeys.all, 'admin'] as const,
};

export const SELLER_REQUEST_STATUS: Record<SellerRequestStatus, StatusStyle> = {
  PENDING: { label: 'İnceleniyor', className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  APPROVED: { label: 'Onaylandı', className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  REJECTED: { label: 'Reddedildi', className: 'text-red-400 bg-red-500/10 border-red-500/20' },
};
