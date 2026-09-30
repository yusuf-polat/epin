import { DepositStatus, Prisma } from '@prisma/client';
import { DbClient, prisma } from '@/config/prisma';
import { PageParams, toSkip } from '@/utils/pagination';
import { AdminDepositListQuery } from './deposit.types';

async function paged(where: Prisma.DepositRequestWhereInput, page: PageParams) {
  const [items, total] = await Promise.all([
    prisma.depositRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: toSkip(page),
      take: page.limit,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.depositRequest.count({ where }),
  ]);
  return { items, total };
}

export const depositRepository = {
  /** Benzersiz referans koduyla oluşturur; nadir çakışmada yeni kodla yeniden dener */
  async createWithReference(data: Omit<Prisma.DepositRequestUncheckedCreateInput, 'referenceCode'>, generate: () => string, attempts = 3) {
    for (let i = 0; ; i++) {
      try {
        return await prisma.depositRequest.create({ data: { ...data, referenceCode: generate() } });
      } catch (err) {
        // Yalnızca referans kodu çakışması yeniden denenir (TX hash çakışması çağırana iletilir)
        const target = err instanceof Prisma.PrismaClientKnownRequestError ? String(err.meta?.target ?? '') : '';
        const isConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && target.includes('referenceCode');
        if (!isConflict || i >= attempts - 1) throw err;
      }
    }
  },

  findById(id: string) {
    return prisma.depositRequest.findUnique({ where: { id } });
  },

  findByTxHash(txHash: string) {
    return prisma.depositRequest.findUnique({ where: { txHash } });
  },

  countPending(userId: string) {
    return prisma.depositRequest.count({ where: { userId, status: 'PENDING' } });
  },

  findByUser(userId: string, page: PageParams) {
    return paged({ userId }, page);
  },

  findForAdmin(query: AdminDepositListQuery) {
    const and: Prisma.DepositRequestWhereInput[] = [];
    if (query.status) and.push({ status: query.status });
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      and.push({ OR: [{ referenceCode: contains }, { senderName: contains }, { txHash: contains }, { user: { email: contains } }] });
    }
    return paged({ AND: and }, query);
  },

  /** Yalnızca PENDING talebi günceller; aynı talep iki kez onaylanıp bakiye iki kez yüklenemez */
  async transitionFromPending(id: string, status: DepositStatus, data: Prisma.DepositRequestUpdateManyMutationInput, db: DbClient = prisma) {
    const { count } = await db.depositRequest.updateMany({ where: { id, status: 'PENDING' }, data: { ...data, status } });
    return count > 0;
  },
};
