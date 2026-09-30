import type { StatusStyle } from '@/types/common';
import type { ComplaintStatus, ComplaintTarget } from './types';

export const complaintKeys = {
  all: ['complaints'] as const,
  admin: (params: object) => [...complaintKeys.all, 'admin', params] as const,
};

/** Backend'deki COMPLAINT_REASONS ile aynı anahtarlar */
export const COMPLAINT_REASONS: [string, string][] = [
  ['FRAUD', 'Dolandırıcılık / çalışmayan kod'],
  ['MISLEADING', 'Yanıltıcı veya yanlış bilgi'],
  ['INAPPROPRIATE', 'Uygunsuz / saldırgan içerik'],
  ['SPAM', 'Spam veya reklam'],
  ['COPYRIGHT', 'Telif veya marka ihlali'],
  ['OTHER', 'Diğer'],
];

export const TARGET_LABELS: Record<ComplaintTarget, string> = { PRODUCT: 'İlan', STORE: 'Mağaza', REVIEW: 'Yorum' };

export const REPORT_TITLES: Record<ComplaintTarget, string> = {
  PRODUCT: 'İlanı Şikâyet Et',
  STORE: 'Mağazayı Şikâyet Et',
  REVIEW: 'Yorumu Şikâyet Et',
};

export const COMPLAINT_STATUS: Record<ComplaintStatus, StatusStyle> = {
  OPEN: { label: 'Açık', className: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  RESOLVED: { label: 'Haklı Bulundu', className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  DISMISSED: { label: 'Reddedildi', className: 'bg-slate-500/10 text-slate-300 border-slate-500/30' },
};

/** Haklı bulunan şikâyette içeriğe uygulanan işlem */
export const TAKEDOWN_LABELS: Record<ComplaintTarget, string> = {
  PRODUCT: 'İlanı yayından kaldır',
  STORE: 'Mağazayı askıya al',
  REVIEW: 'Yorumu sil',
};
