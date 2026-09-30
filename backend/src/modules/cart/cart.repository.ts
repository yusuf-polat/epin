import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma';

export const cartItemInclude = {
  variant: {
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          imageUrl: true,
          brand: true,
          region: true,
          deliveryType: true,
          sellerId: true,
          approvalStatus: true,
          isActive: true,
          isListed: true,
          seller: { select: { isBanned: true, store: { select: { name: true, slug: true, isActive: true } } } },
        },
      },
      _count: { select: { pins: { where: { status: 'AVAILABLE' } } } },
    },
  },
} satisfies Prisma.CartItemInclude;

export type CartItemRecord = Prisma.CartItemGetPayload<{ include: typeof cartItemInclude }>;

export const cartRepository = {
  findByUser(userId: string) {
    return prisma.cartItem.findMany({ where: { userId }, include: cartItemInclude, orderBy: { createdAt: 'desc' } });
  },

  findVariant(variantId: string) {
    return prisma.productVariant.findUnique({ where: { id: variantId }, include: cartItemInclude.variant.include });
  },

  findItem(userId: string, variantId: string) {
    return prisma.cartItem.findUnique({ where: { userId_variantId: { userId, variantId } } });
  },

  findItemById(userId: string, itemId: string) {
    return prisma.cartItem.findFirst({ where: { id: itemId, userId } });
  },

  upsertQuantity(userId: string, variantId: string, quantity: number) {
    return prisma.cartItem.upsert({
      where: { userId_variantId: { userId, variantId } },
      update: { quantity },
      create: { userId, variantId, quantity },
    });
  },

  updateQuantity(itemId: string, quantity: number) {
    return prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  },

  remove(userId: string, itemId: string) {
    return prisma.cartItem.deleteMany({ where: { id: itemId, userId } });
  },

  clear(userId: string) {
    return prisma.cartItem.deleteMany({ where: { userId } });
  },
};
