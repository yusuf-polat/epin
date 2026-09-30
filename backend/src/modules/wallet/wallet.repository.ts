import { DbClient, prisma } from '@/config/prisma';
import { PageParams, toSkip } from '@/utils/pagination';
import { Prisma } from '@prisma/client';
import { AdminLedgerQuery, LedgerEntry } from './wallet.types';

export const walletRepository = {
  /** Bakiyeye para ekler ve hareket kaydı oluşturur */
  async credit(db: DbClient, entry: LedgerEntry) {
    await db.user.update({
      where: { id: entry.userId },
      data: { walletBalance: { increment: entry.amount } },
    });
    await db.walletTransaction.create({
      data: { ...entry, amount: entry.amount },
    });
  },

  /**
   * Koşullu bakiye düşümü: yalnızca bakiye yeterliyse günceller.
   * Eşzamanlı isteklerde bakiyenin eksiye düşmesini engeller.
   * @returns düşüm yapıldıysa true
   */
  async debitIfSufficient(db: DbClient, entry: LedgerEntry): Promise<boolean> {
    const { count } = await db.user.updateMany({
      where: { id: entry.userId, walletBalance: { gte: entry.amount } },
      data: { walletBalance: { decrement: entry.amount } },
    });
    if (count === 0) return false;
    await db.walletTransaction.create({
      data: { ...entry, amount: -entry.amount },
    });
    return true;
  },

  async pendingWithdrawalTotal(userId: string) {
    const agg = await prisma.withdrawalRequest.aggregate({ where: { userId, status: 'PENDING' }, _sum: { amount: true } });
    return agg._sum.amount;
  },

  /** Yönetim: tüm cüzdan hareketleri (kullanıcı, tür, e-posta/açıklama araması) */
  async findAllTransactions(query: AdminLedgerQuery) {
    const and: Prisma.WalletTransactionWhereInput[] = [];
    if (query.userId) and.push({ userId: query.userId });
    if (query.type) and.push({ type: query.type });
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      and.push({ OR: [{ description: contains }, { user: { email: contains } }] });
    }
    const where: Prisma.WalletTransactionWhereInput = { AND: and };
    const [items, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        skip: toSkip(query),
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } }, order: { select: { id: true, orderNumber: true } } },
      }),
      prisma.walletTransaction.count({ where }),
    ]);
    return { items, total };
  },

  getBalance(userId: string) {
    return prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } });
  },

  async findTransactions(userId: string, page: PageParams) {
    const where = { userId };
    const [items, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        skip: toSkip(page),
        take: page.limit,
        orderBy: { createdAt: 'desc' },
        include: { order: { select: { id: true, orderNumber: true } } },
      }),
      prisma.walletTransaction.count({ where }),
    ]);
    return { items, total };
  },
};
