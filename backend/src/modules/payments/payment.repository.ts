import { PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { DbClient, prisma } from '@/config/prisma';
import { PageParams, toSkip } from '@/utils/pagination';
import { AdminPaymentListQuery } from './payment.types';

const userSelect = { select: { id: true, name: true, email: true } } as const;

export const gatewayRepository = {
  findAll() {
    return prisma.paymentGateway.findMany();
  },

  find(provider: PaymentProvider) {
    return prisma.paymentGateway.findUnique({ where: { provider } });
  },

  upsert(provider: PaymentProvider, create: Prisma.PaymentGatewayUncheckedCreateInput, update: Prisma.PaymentGatewayUncheckedUpdateInput) {
    return prisma.paymentGateway.upsert({ where: { provider }, create, update });
  },
};

export const paymentRepository = {
  create(data: Prisma.PaymentUncheckedCreateInput) {
    return prisma.payment.create({ data });
  },

  update(id: string, data: Prisma.PaymentUncheckedUpdateInput) {
    return prisma.payment.update({ where: { id }, data });
  },

  findById(id: string) {
    return prisma.payment.findUnique({ where: { id } });
  },

  findByRef(provider: PaymentProvider, providerRef: string) {
    return prisma.payment.findUnique({ where: { provider_providerRef: { provider, providerRef } } });
  },

  countRecentPending(userId: string, since: Date) {
    return prisma.payment.count({ where: { userId, status: 'PENDING', createdAt: { gte: since } } });
  },

  /**
   * Koşullu durum geçişi: kayıt yalnızca `from` durumlarından birindeyse güncellenir.
   * Aynı ödeme iki kez sonuçlanamaz, bakiye iki kez yüklenemez.
   */
  async transition(id: string, from: PaymentStatus[], to: PaymentStatus, data: Prisma.PaymentUpdateManyMutationInput = {}, db: DbClient = prisma) {
    const { count } = await db.payment.updateMany({ where: { id, status: { in: from } }, data: { ...data, status: to } });
    return count > 0;
  },

  async findByUser(userId: string, page: PageParams) {
    const where = { userId };
    const [items, total] = await Promise.all([
      prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, skip: toSkip(page), take: page.limit }),
      prisma.payment.count({ where }),
    ]);
    return { items, total };
  },

  async findForAdmin(query: AdminPaymentListQuery) {
    const and: Prisma.PaymentWhereInput[] = [];
    if (query.status) and.push({ status: query.status });
    if (query.provider) and.push({ provider: query.provider });
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      and.push({ OR: [{ id: { startsWith: query.search } }, { providerRef: contains }, { user: { email: contains } }] });
    }
    const where: Prisma.PaymentWhereInput = { AND: and };
    const [items, total] = await Promise.all([
      prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, skip: toSkip(query), take: query.limit, include: { user: userSelect } }),
      prisma.payment.count({ where }),
    ]);
    return { items, total };
  },

  /** Süresi dolmuş bekleyen ödemeleri zaman aşımına düşürür */
  async expireStale(before: Date, providers: PaymentProvider[]) {
    const { count } = await prisma.payment.updateMany({
      where: { status: 'PENDING', provider: { in: providers }, createdAt: { lt: before } },
      data: { status: 'EXPIRED', failureReason: 'Ödeme süresi doldu' },
    });
    return count;
  },
};
