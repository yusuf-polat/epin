import type { StatusStyle } from '@/types/common';
import type { DisputeReason, DisputeStatus } from './types';

export const disputeKeys = {
  all: ['disputes'] as const,
  mine: () => [...disputeKeys.all, 'mine'] as const,
  seller: () => [...disputeKeys.all, 'seller'] as const,
  admin: (status?: DisputeStatus) => [...disputeKeys.all, 'admin', status ?? 'ALL'] as const,
};

/** Karar bekleyen (escrow'u donduran) itiraz durumları */
export const ACTIVE_DISPUTE_STATUSES: DisputeStatus[] = ['WAITING_SELLER', 'WAITING_SUPPORT'];

export const YOUTUBE_URL_REGEX = /^https?:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/;
export const extractYoutubeId = (url: string) => YOUTUBE_URL_REGEX.exec(url.trim())?.[4] ?? null;

export const DISPUTE_REASON_OPTIONS: { value: DisputeReason; label: string; desc: string }[] = [
  { value: 'INVALID_CODE', label: 'Geçersiz veya hatalı kod', desc: 'Kod, kullanmak istediğim platformda kabul edilmedi.' },
  { value: 'ALREADY_USED', label: 'Kod önceden kullanılmış', desc: 'Kodun daha önce kullanıldığını belirten bir hata aldım.' },
  { value: 'WRONG_PRODUCT', label: 'Yanlış ürün veya paket', desc: 'Sipariş ettiğim üründen farklı bir kod geldi.' },
  { value: 'OTHER', label: 'Diğer', desc: 'Yukarıdaki kategorilere girmeyen başka bir sorun.' },
];

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  INVALID_CODE: 'Geçersiz Kod',
  ALREADY_USED: 'Kod Daha Önce Kullanılmış',
  WRONG_PRODUCT: 'Yanlış Ürün',
  OTHER: 'Diğer',
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, StatusStyle> = {
  WAITING_SELLER: { label: 'Satıcı Yanıtı Bekleniyor', className: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  SELLER_APPROVED: { label: 'Satıcı Çözdü', className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  WAITING_SUPPORT: { label: 'Hakem İncelemesinde', className: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
  RESOLVED_BUYER: { label: 'Alıcı Lehine Sonuçlandı', className: 'bg-sky-500/10 text-sky-300 border-sky-500/30' },
  RESOLVED_SELLER: { label: 'Satıcı Lehine Sonuçlandı', className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  CANCELLED: { label: 'Geri Çekildi', className: 'bg-slate-500/10 text-slate-300 border-slate-500/30' },
};
