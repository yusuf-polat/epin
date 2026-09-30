import type { StatusStyle } from '@/types/common';
import type { TicketPriority, TicketStatus } from './types';

export const supportKeys = {
  all: ['support'] as const,
  mine: () => [...supportKeys.all, 'mine'] as const,
  admin: (filter: { status?: TicketStatus; search?: string }) => [...supportKeys.all, 'admin', filter] as const,
  ticket: (id: string) => [...supportKeys.all, 'ticket', id] as const,
};

export const TICKET_CATEGORIES = [
  'E-Pin & Kod Aktivasyonu',
  'Ödeme & Cüzdan Bakiye',
  'Pazar & Satıcı İşlemleri',
  'Hesap & Güvenlik',
  'Teknik Hata & Bildirim',
  'Diğer Konular',
];

export const TICKET_STATUS_LABELS: Record<TicketStatus, StatusStyle> = {
  OPEN: { label: 'Açık', className: 'bg-sky-500/10 text-sky-300 border-sky-500/30' },
  IN_PROGRESS: { label: 'İşlemde', className: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  WAITING_USER: { label: 'Yanıtınız Bekleniyor', className: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
  RESOLVED: { label: 'Çözüldü', className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  CLOSED: { label: 'Kapandı', className: 'bg-slate-500/10 text-slate-300 border-slate-500/30' },
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = { LOW: 'Düşük', MEDIUM: 'Orta', HIGH: 'Yüksek', URGENT: 'Acil' };
