import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { PageParams, toSkip } from '@/utils/pagination';

const INSERT_CHUNK = 1000;

export const broadcastRepository = {
  countUsers(where: Prisma.UserWhereInput) {
    return prisma.user.count({ where });
  },

  findUsers(where: Prisma.UserWhereInput) {
    return prisma.user.findMany({ where, select: { id: true, email: true, name: true } });
  },

  /** Çok sayıda alıcı için bildirimleri parçalar halinde yazar */
  async createNotifications(userIds: string[], content: { title: string; message: string; link: string | null }) {
    for (let i = 0; i < userIds.length; i += INSERT_CHUNK) {
      await prisma.notification.createMany({
        data: userIds.slice(i, i + INSERT_CHUNK).map((userId) => ({ userId, type: 'SYSTEM' as const, ...content })),
      });
    }
  },

  create(data: Prisma.NotificationBroadcastUncheckedCreateInput) {
    return prisma.notificationBroadcast.create({ data });
  },

  setEmailCount(id: string, emailCount: number) {
    return prisma.notificationBroadcast.update({ where: { id }, data: { emailCount } });
  },

  async list(page: PageParams) {
    const [items, total] = await Promise.all([
      prisma.notificationBroadcast.findMany({
        orderBy: { createdAt: 'desc' },
        skip: toSkip(page),
        take: page.limit,
        include: { sentBy: { select: { id: true, name: true } } },
      }),
      prisma.notificationBroadcast.count(),
    ]);
    return { items, total };
  },
};
