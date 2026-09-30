import type { StatusStyle } from '@/types/common';
import type { DeliveryType, ProductFilters } from './types';

export const productKeys = {
  all: ['products'] as const,
  list: (filters: ProductFilters) => ['products', 'list', filters] as const,
  reviews: (slug: string) => ['products', 'reviews', slug] as const,
  mine: ['products', 'mine'] as const,
  editable: (id: string) => ['products', 'mine', 'edit', id] as const,
  admin: (params: object) => ['products', 'admin', params] as const,
  adminReviews: (params: object) => ['products', 'admin-reviews', params] as const,
};

export const deliveryLabel = (type: DeliveryType, hours?: number) =>
  type === 'MANUAL' ? `Satıcı Teslimatı${hours ? ` (${hours} saat)` : ''}` : 'Anında Teslimat';

export const LISTING_STATUS: Record<'PENDING' | 'APPROVED' | 'REJECTED' | 'CLOSED' | 'UNLISTED', StatusStyle> = {
  PENDING: { label: 'Onay Bekliyor', className: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  APPROVED: { label: 'Yayında', className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  REJECTED: { label: 'Reddedildi', className: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  CLOSED: { label: 'Satışa Kapalı', className: 'bg-slate-500/10 text-slate-300 border-slate-500/30' },
  UNLISTED: { label: 'Yayından Kaldırıldı', className: 'bg-slate-500/10 text-slate-300 border-slate-500/30' },
};

export const MAX_GALLERY_IMAGES = 10;
export const MAX_CODES_PER_REQUEST = 1000;
export const DEFAULT_DELIVERY_HOURS = 24;
export const MAX_DELIVERY_HOURS = 168;
