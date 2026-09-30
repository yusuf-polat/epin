import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { toSkip } from '@/utils/pagination';
import { AdminReviewListQuery } from './review.types';

export const reviewRepository = {
  findProductBySlug(slug: string) {
    return prisma.product.findUnique({ where: { slug }, select: { id: true, slug: true, sellerId: true } });
  },

  findByProduct(productId: string) {
    return prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
  },

  findOne(userId: string, productId: string) {
    return prisma.review.findUnique({ where: { userId_productId: { userId, productId } } });
  },

  /** İade edilmemiş bir siparişte bu ürünü satın almış mı? */
  findEligibleOrder(userId: string, productId: string) {
    return prisma.order.findFirst({
      where: {
        userId,
        escrowStatus: { not: 'REFUNDED_TO_BUYER' },
        deliveryStatus: 'DELIVERED',
        items: { some: { variant: { productId } } },
      },
      select: { id: true },
    });
  },

  findById(id: string) {
    return prisma.review.findUnique({ where: { id }, include: { product: { select: { id: true, slug: true, title: true, sellerId: true } } } });
  },

  setReply(id: string, reply: string | null) {
    return prisma.review.update({
      where: { id },
      data: { sellerReply: reply, sellerRepliedAt: reply ? new Date() : null },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
  },

  delete(id: string) {
    return prisma.review.delete({ where: { id } });
  },

  async findForAdmin(query: AdminReviewListQuery) {
    const and: Prisma.ReviewWhereInput[] = [];
    if (query.rating) and.push({ rating: query.rating });
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      and.push({ OR: [{ comment: contains }, { user: { email: contains } }, { product: { title: contains } }] });
    }
    const where: Prisma.ReviewWhereInput = { AND: and };
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: toSkip(query),
        take: query.limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, slug: true, title: true, seller: { select: { id: true, name: true } } } },
        },
      }),
      prisma.review.count({ where }),
    ]);
    return { items, total };
  },

  create(data: { userId: string; productId: string; orderId: string; rating: number; comment: string }) {
    return prisma.review.create({
      data,
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
  },
};
