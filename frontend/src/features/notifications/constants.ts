import type { NotificationType } from './types';

export const notificationKeys = {
  all: ['notifications'] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
  list: (params: { page: number; limit: number; type?: NotificationType }) => [...notificationKeys.all, 'list', params] as const,
};

/** Okunmamış bildirim sayısı yoklama aralığı (sekme görünürken) */
export const UNREAD_POLL_MS = 30_000;

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  ORDER: 'receipt_long',
  PRODUCT: 'inventory_2',
  DISPUTE: 'gavel',
  WALLET: 'account_balance_wallet',
  SELLER_REQUEST: 'storefront',
  SUPPORT: 'support_agent',
  MESSAGE: 'chat',
  SYSTEM: 'notifications',
};

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  ORDER: 'Sipariş',
  PRODUCT: 'İlan',
  DISPUTE: 'İtiraz',
  WALLET: 'Cüzdan',
  SELLER_REQUEST: 'Satıcı Başvurusu',
  SUPPORT: 'Destek',
  MESSAGE: 'Mesaj',
  SYSTEM: 'Sistem',
};
