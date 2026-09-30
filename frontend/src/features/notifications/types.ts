export type NotificationType = 'ORDER' | 'DISPUTE' | 'SELLER_REQUEST' | 'PRODUCT' | 'SYSTEM' | 'WALLET' | 'SUPPORT' | 'MESSAGE';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}
