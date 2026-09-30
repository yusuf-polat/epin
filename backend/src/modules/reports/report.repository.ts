import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma';

/** İade edilen siparişler ciroya dahil edilmez */
const countedOrder: Prisma.OrderWhereInput = { escrowStatus: { not: 'REFUNDED_TO_BUYER' } };

export const reportRepository = {
  async pendingWork() {
    const [listings, disputes, tickets, sellerRequests, deposits, withdrawals] = await Promise.all([
      prisma.product.count({ where: { approvalStatus: 'PENDING' } }),
      prisma.dispute.count({ where: { status: 'WAITING_SUPPORT' } }),
      prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.sellerRequest.count({ where: { status: 'PENDING' } }),
      prisma.depositRequest.count({ where: { status: 'PENDING' } }),
      prisma.withdrawalRequest.count({ where: { status: 'PENDING' } }),
    ]);
    return { listings, disputes, tickets, sellerRequests, deposits, withdrawals };
  },

  async platformCounts() {
    const [users, sellers, activeListings, stores] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { canSell: true } }),
      prisma.product.count({ where: { approvalStatus: 'APPROVED', isActive: true, isListed: true } }),
      prisma.store.count({ where: { isActive: true } }),
    ]);
    return { users, sellers, activeListings, stores };
  },

  /** Belirtilen tarihten bu yana sipariş sayısı, ciro ve komisyon */
  async salesSince(since: Date) {
    const agg = await prisma.order.aggregate({
      where: { ...countedOrder, createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { totalAmount: true, commissionAmount: true },
    });
    return { orders: agg._count._all, gmv: agg._sum.totalAmount, commission: agg._sum.commissionAmount };
  },

  async moneyInFlight() {
    const [escrow, realizedCommission, withdrawals] = await Promise.all([
      prisma.order.aggregate({ where: { escrowStatus: { in: ['HELD_IN_ESCROW', 'DISPUTED'] } }, _sum: { escrowAmount: true } }),
      prisma.order.aggregate({ where: { escrowStatus: 'RELEASED_TO_SELLER' }, _sum: { commissionAmount: true } }),
      prisma.withdrawalRequest.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
    ]);
    return {
      escrowHeld: escrow._sum.escrowAmount,
      realizedCommission: realizedCommission._sum.commissionAmount,
      pendingWithdrawals: withdrawals._sum.amount,
    };
  },

  /** Son N günün günlük satış serisi (İstanbul saatine göre) */
  dailySales(days: number) {
    return prisma.$queryRaw<{ day: Date; orders: bigint; gmv: Prisma.Decimal | null; commission: Prisma.Decimal | null }[]>`
      SELECT date_trunc('day', "createdAt" AT TIME ZONE 'Europe/Istanbul') AS day,
             COUNT(*) AS orders,
             SUM("totalAmount") AS gmv,
             SUM("commissionAmount") AS commission
      FROM "orders"
      WHERE "escrowStatus" <> 'REFUNDED_TO_BUYER'
        AND "createdAt" >= NOW() - (${days}::int * INTERVAL '1 day')
      GROUP BY 1
      ORDER BY 1`;
  },
};
