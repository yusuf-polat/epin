import { NotificationType } from '@prisma/client';
import { NotFoundError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { PageParams } from '@/utils/pagination';
import { notificationRepository } from './notification.repository';
import { SendNotificationInput } from './notification.types';

export type { SendNotificationInput } from './notification.types';

export const notificationService = {
  /** Bildirim gönderimi ana iş akışını asla bozmamalıdır; hata loglanır ve yutulur */
  async send(input: SendNotificationInput) {
    try {
      return await notificationRepository.create(input);
    } catch (err) {
      logger.error('Failed to send notification', { userId: input.userId, type: input.type, err });
      return null;
    }
  },

  async sendMany(inputs: SendNotificationInput[]) {
    if (inputs.length === 0) return;
    try {
      await notificationRepository.createMany(inputs);
    } catch (err) {
      logger.error('Failed to send notifications', { count: inputs.length, err });
    }
  },

  /** Tüm DESTEK/ADMIN kullanıcılarına bildirim gönderir */
  async notifyStaff(input: Omit<SendNotificationInput, 'userId'>) {
    try {
      const staff = await notificationRepository.findStaffIds();
      await this.sendMany(staff.map((s) => ({ ...input, userId: s.id })));
    } catch (err) {
      logger.error('Failed to notify staff', { err });
    }
  },

  list(userId: string, page: PageParams, type?: NotificationType) {
    return notificationRepository.findByUser(userId, page, type);
  },

  countUnread(userId: string) {
    return notificationRepository.countUnread(userId);
  },

  async markAsRead(userId: string, id: string) {
    const { count } = await notificationRepository.markRead(userId, id);
    if (count === 0) throw new NotFoundError('Bildirim bulunamadı');
  },

  markAllAsRead(userId: string) {
    return notificationRepository.markAllRead(userId);
  },

  async remove(userId: string, id: string) {
    const { count } = await notificationRepository.delete(userId, id);
    if (count === 0) throw new NotFoundError('Bildirim bulunamadı');
  },
};
