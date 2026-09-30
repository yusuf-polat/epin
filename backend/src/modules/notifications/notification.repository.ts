import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { PageParams, toSkip } from '@/utils/pagination';

export const notificationRepository = {
  create(data: Prisma.NotificationUncheckedCreateInput) {
    return prisma.notification.create({ data });
  },

  createMany(data: Prisma.NotificationCreateManyInput[]) {
    return prisma.notification.createMany({ data });
  },

  async findByUser(userId: string, page: PageParams, type?: NotificationType) {
    const where: Prisma.NotificationWhereInput = { userId, ...(type ? { type } : {}) };
    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, skip: toSkip(page), take: page.limit, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { items, total, unreadCount };
  },

  countUnread(userId: string) {
    return prisma.notification.count({ where: { userId, isRead: false } });
  },

  markRead(userId: string, id: string) {
    return prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  },

  markAllRead(userId: string) {
    return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  },

  delete(userId: string, id: string) {
    return prisma.notification.deleteMany({ where: { id, userId } });
  },

  findStaffIds() {
    return prisma.user.findMany({ where: { role: { in: ['DESTEK', 'ADMIN'] }, isBanned: false }, select: { id: true } });
  },
};
