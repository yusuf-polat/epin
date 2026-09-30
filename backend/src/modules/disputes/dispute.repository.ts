import { DisputeStatus, Prisma } from '@prisma/client';
import { DbClient, prisma } from '@/config/prisma';

const partySelect = { id: true, name: true, avatarUrl: true } satisfies Prisma.UserSelect;

export const disputeListInclude = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      escrowAmount: true,
      escrowStatus: true,
      createdAt: true,
      items: {
        select: {
          quantity: true,
          totalPrice: true,
          variant: { select: { title: true, product: { select: { title: true, imageUrl: true, slug: true } } } },
        },
      },
    },
  },
  buyer: { select: partySelect },
  seller: { select: partySelect },
} satisfies Prisma.DisputeInclude;

export type DisputeRecord = Prisma.DisputeGetPayload<{ include: typeof disputeListInclude }>;

export const disputeRepository = {
  findOrderForDispute(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, userId: true, sellerId: true, escrowStatus: true, deliveryStatus: true, dispute: true },
    });
  },

  findById(id: string) {
    return prisma.dispute.findUnique({ where: { id }, include: disputeListInclude });
  },

  findMany(where: Prisma.DisputeWhereInput) {
    return prisma.dispute.findMany({ where, orderBy: { createdAt: 'desc' }, include: disputeListInclude, take: 200 });
  },

  upsertForOrder(db: DbClient, orderId: string, data: Omit<Prisma.DisputeUncheckedCreateInput, 'orderId'>) {
    return db.dispute.upsert({
      where: { orderId },
      create: { ...data, orderId },
      update: {
        ...data,
        sellerResponse: null,
        sellerAction: null,
        sellerActionAt: null,
        replacementCode: null,
        resolvedByAdminId: null,
        adminNotes: null,
        resolvedAt: null,
      },
    });
  },

  /** İtirazı yalnızca beklenen durumdaysa günceller (çift karar koruması) */
  async transition(db: DbClient, id: string, from: DisputeStatus[], data: Prisma.DisputeUpdateManyMutationInput) {
    const { count } = await db.dispute.updateMany({ where: { id, status: { in: from } }, data });
    return count > 0;
  },

  firstOrderVariant(db: DbClient, orderId: string) {
    return db.orderItem.findFirst({ where: { orderId }, select: { variantId: true } });
  },

  createReplacementPin(db: DbClient, data: Prisma.DigitalPinUncheckedCreateInput) {
    return db.digitalPin.create({ data });
  },

  findStaleWaitingSeller(olderThan: Date, limit: number) {
    return prisma.dispute.findMany({
      where: { status: 'WAITING_SELLER', createdAt: { lte: olderThan } },
      select: { id: true, orderId: true, buyerId: true, sellerId: true },
      take: limit,
    });
  },
};
