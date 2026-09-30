import { Prisma, WithdrawalStatus } from '@prisma/client';
import { DbClient, prisma } from '@/config/prisma';
import { PageParams, toSkip } from '@/utils/pagination';
import { AdminWithdrawalListQuery } from './withdrawal.types';

const userSelect = { select: { id: true, name: true, email: true } } as const;

async function paged(where: Prisma.WithdrawalRequestWhereInput, page: PageParams) {
  const [items, total] = await Promise.all([
    prisma.withdrawalRequest.findMany({ where, orderBy: { createdAt: 'desc' }, skip: toSkip(page), take: page.limit, include: { user: userSelect } }),
    prisma.withdrawalRequest.count({ where }),
  ]);
  return { items, total };
}

export const withdrawalRepository = {
  create(db: DbClient, data: Prisma.WithdrawalRequestUncheckedCreateInput) {
    return db.withdrawalRequest.create({ data });
  },

  findById(id: string) {
    return prisma.withdrawalRequest.findUnique({ where: { id } });
  },

  countPending(userId: string) {
    return prisma.withdrawalRequest.count({ where: { userId, status: 'PENDING' } });
  },

  findByUser(userId: string, page: PageParams) {
    return paged({ userId }, page);
  },

  findForAdmin(query: AdminWithdrawalListQuery) {
    const and: Prisma.WithdrawalRequestWhereInput[] = [];
    if (query.status) and.push({ status: query.status });
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      and.push({ OR: [{ user: { email: contains } }, { user: { name: contains } }, { accountHolder: contains }] });
    }
    return paged({ AND: and }, query);
  },

  /** Yalnızca PENDING talebi günceller; eşzamanlı işlemlerde çift iade/ödeme olmaz */
  async transitionFromPending(id: string, status: WithdrawalStatus, data: Prisma.WithdrawalRequestUpdateManyMutationInput, db: DbClient = prisma) {
    const { count } = await db.withdrawalRequest.updateMany({ where: { id, status: 'PENDING' }, data: { ...data, status } });
    return count > 0;
  },
};
