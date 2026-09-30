import { Prisma } from '@prisma/client';
import { DbClient, prisma } from '@/config/prisma';
import { PageParams, toSkip } from '@/utils/pagination';
import { AdminOrderListQuery } from './order.types';

const orderItemsInclude = {
  items: {
    include: {
      variant: {
        select: {
          id: true,
          title: true,
          denomination: true,
          product: { select: { id: true, title: true, slug: true, imageUrl: true, brand: true, deliveryType: true, deliveryInstructions: true } },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

export const orderDetailInclude = {
  ...orderItemsInclude,
  pins: { select: { id: true, code: true, serialNumber: true, variantId: true, soldAt: true } },
  dispute: { select: { id: true, status: true, reason: true, sellerAction: true, createdAt: true } },
  seller: { select: { id: true, name: true, avatarUrl: true, store: { select: { name: true, slug: true } } } },
  user: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.OrderInclude;

export type OrderDetailRecord = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

async function paged(where: Prisma.OrderWhereInput, page: PageParams) {
  const [items, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, include: orderDetailInclude, skip: toSkip(page), take: page.limit }),
    prisma.order.count({ where }),
  ]);
  return { items, total };
}

/** Escrow'un bir sonraki işlem tarafından ele alınabileceği (aktif itirazı olmayan) siparişler */
const noActiveDispute: Prisma.OrderWhereInput = {
  OR: [
    { dispute: null },
    { dispute: { status: 'CANCELLED' } },
    { dispute: { status: 'SELLER_APPROVED', sellerAction: 'REPLACE' } },
  ],
};

export const orderRepository = {
  findVariantsForCheckout(variantIds: string[]) {
    return prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            sellerId: true,
            deliveryType: true,
            deliveryDeadlineHours: true,
            approvalStatus: true,
            isActive: true,
            isListed: true,
            category: { select: { commissionRate: true } },
            seller: { select: { isBanned: true, store: { select: { isActive: true } } } },
          },
        },
      },
    });
  },

  findCartLines(userId: string) {
    return prisma.cartItem.findMany({ where: { userId }, select: { variantId: true, quantity: true } });
  },

  createOrder(db: DbClient, data: Prisma.OrderUncheckedCreateInput) {
    return db.order.create({ data });
  },

  createOrderItem(db: DbClient, data: Prisma.OrderItemUncheckedCreateInput) {
    return db.orderItem.create({ data });
  },

  /**
   * Stoktaki kodları atomik olarak ayırır. FOR UPDATE SKIP LOCKED sayesinde
   * eşzamanlı iki checkout aynı kodu asla alamaz.
   */
  async claimPins(db: DbClient, variantId: string, quantity: number, orderId: string, userId: string) {
    const rows = await db.$queryRaw<{ id: string; code: string; serialNumber: string | null }[]>`
      UPDATE "digital_pins"
      SET "status" = 'SOLD', "orderId" = ${orderId}, "userId" = ${userId}, "soldAt" = NOW(), "updatedAt" = NOW()
      WHERE "id" IN (
        SELECT "id" FROM "digital_pins"
        WHERE "variantId" = ${variantId} AND "status" = 'AVAILABLE'
        ORDER BY "createdAt" ASC
        LIMIT ${quantity}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "code", "serialNumber"`;
    return rows;
  },

  /** Stok adedini yalnızca yeterliyse düşer; düşüm yapıldıysa true */
  async decrementStock(db: DbClient, variantId: string, quantity: number) {
    const { count } = await db.productVariant.updateMany({
      where: { id: variantId, stockCount: { gte: quantity } },
      data: { stockCount: { decrement: quantity } },
    });
    return count > 0;
  },

  incrementStock(db: DbClient, variantId: string, quantity: number) {
    return db.productVariant.update({ where: { id: variantId }, data: { stockCount: { increment: quantity } } });
  },

  createDeliveredPins(db: DbClient, rows: Prisma.DigitalPinCreateManyInput[]) {
    return db.digitalPin.createMany({ data: rows });
  },

  clearCartLines(db: DbClient, userId: string, variantIds: string[]) {
    return db.cartItem.deleteMany({ where: { userId, variantId: { in: variantIds } } });
  },

  findBuyerOrders(userId: string, page: PageParams) {
    return paged({ userId }, page);
  },

  findSellerOrders(sellerId: string, onlyPending: boolean, page: PageParams) {
    return paged({ sellerId, ...(onlyPending ? { deliveryStatus: 'PENDING', escrowStatus: 'HELD_IN_ESCROW' } : {}) }, page);
  },

  /** Yönetim: tüm siparişler (sipariş no, alıcı/satıcı e-postası ile arama) */
  findForAdmin(query: AdminOrderListQuery) {
    const and: Prisma.OrderWhereInput[] = [];
    if (query.escrowStatus) and.push({ escrowStatus: query.escrowStatus });
    if (query.deliveryStatus) and.push({ deliveryStatus: query.deliveryStatus });
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      and.push({ OR: [{ orderNumber: contains }, { user: { email: contains } }, { seller: { email: contains } }] });
    }
    return paged({ AND: and }, query);
  },

  findById(orderId: string) {
    return prisma.order.findUnique({ where: { id: orderId }, include: orderDetailInclude });
  },

  /**
   * Durum makinesi geçişi: sipariş yalnızca beklenen durumdaysa güncellenir.
   * Aynı escrow'un iki kez serbest bırakılmasını/iade edilmesini engeller.
   */
  async transition(db: DbClient, orderId: string, from: Prisma.OrderWhereInput, data: Prisma.OrderUpdateManyMutationInput) {
    const { count } = await db.order.updateMany({ where: { id: orderId, ...from }, data });
    return count > 0;
  },

  findReleasable(limit: number) {
    return prisma.order.findMany({
      where: {
        escrowStatus: 'HELD_IN_ESCROW',
        deliveryStatus: 'DELIVERED',
        autoReleaseAt: { lte: new Date() },
        ...noActiveDispute,
      },
      select: { id: true },
      take: limit,
    });
  },

  findOverdueManual(limit: number) {
    return prisma.order.findMany({
      where: {
        escrowStatus: 'HELD_IN_ESCROW',
        deliveryStatus: 'PENDING',
        deliveryDeadlineAt: { lte: new Date() },
        ...noActiveDispute,
      },
      select: { id: true },
      take: limit,
    });
  },

  /** Escrow işlemleri için sipariş özeti */
  findEscrowInfo(db: DbClient, orderId: string) {
    return db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        sellerId: true,
        escrowAmount: true,
        totalAmount: true,
        commissionAmount: true,
        items: { select: { variantId: true, quantity: true } },
      },
    });
  },

  noActiveDispute,
};
