import { prisma } from '@/config/prisma';
import { PageParams, toSkip } from '@/utils/pagination';

export const pinRepository = {
  async findByUser(userId: string, page: PageParams) {
    const where = { userId, status: 'SOLD' as const };
    const [items, total] = await Promise.all([
      prisma.digitalPin.findMany({
      where,
      orderBy: { soldAt: 'desc' },
      skip: toSkip(page),
      take: page.limit,
      include: {
        order: { select: { id: true, orderNumber: true, createdAt: true, escrowStatus: true } },
        variant: {
          select: {
            title: true,
            denomination: true,
            product: { select: { id: true, title: true, slug: true, imageUrl: true, brand: true, region: true } },
          },
        },
      },
      }),
      prisma.digitalPin.count({ where }),
    ]);
    return { items, total };
  },

  findOwned(pinId: string, userId: string) {
    return prisma.digitalPin.findFirst({
      where: { id: pinId, userId, status: 'SOLD' },
      include: { variant: { select: { title: true, denomination: true, product: { select: { title: true } } } } },
    });
  },
};
