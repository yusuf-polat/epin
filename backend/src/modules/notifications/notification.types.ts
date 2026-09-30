import { NotificationType } from '@prisma/client';

export interface SendNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export interface NotificationListQuery {
  page: number;
  limit: number;
  type?: NotificationType;
}
