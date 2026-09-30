import { ComplaintTarget, Prisma } from '@prisma/client';
import { DbClient, prisma } from '@/config/prisma';
import { toSkip } from '@/utils/pagination';
import { AdminComplaintListQuery, ComplaintTargetInfo } from './complaint.types';

export const complaintRepository = {
  create(data: Prisma.ComplaintUncheckedCreateInput) {
    return prisma.complaint.create({ data });
  },

  findById(id: string) {
    return prisma.complaint.findUnique({ where: { id } });
  },

  findOpenByReporter(reporterId: string, targetType: ComplaintTarget, targetId: string) {
    return prisma.complaint.findFirst({ where: { reporterId, targetType, targetId, status: 'OPEN' } });
  },

  countSince(reporterId: string, since: Date) {
    return prisma.complaint.count({ where: { reporterId, createdAt: { gte: since } } });
  },

  async findForAdmin(query: AdminComplaintListQuery) {
    const where: Prisma.ComplaintWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: toSkip(query),
        take: query.limit,
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          resolvedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.complaint.count({ where }),
    ]);
    return { items, total };
  },

  /** Aynı içerik hakkındaki açık şikâyet sayıları */
  async countOpenByTargets(targetIds: string[]) {
    const rows = await prisma.complaint.groupBy({ by: ['targetId'], where: { targetId: { in: targetIds }, status: 'OPEN' }, _count: { _all: true } });
    return new Map(rows.map((r) => [r.targetId, r._count._all]));
  },

  /** Aynı içerik hakkındaki tüm açık şikâyetleri birlikte sonuçlandırır */
  resolveOpenForTarget(db: DbClient, targetType: ComplaintTarget, targetId: string, data: Prisma.ComplaintUpdateManyMutationInput & { resolvedById: string }) {
    return db.complaint.updateMany({ where: { targetType, targetId, status: 'OPEN' }, data });
  },

  async findTarget(targetType: ComplaintTarget, targetId: string): Promise<ComplaintTargetInfo | null> {
    if (targetType === 'PRODUCT') {
      const p = await prisma.product.findUnique({ where: { id: targetId }, select: { title: true, slug: true, sellerId: true } });
      return p && { title: p.title, link: `/urun/${p.slug}`, ownerId: p.sellerId };
    }
    if (targetType === 'STORE') {
      const s = await prisma.store.findUnique({ where: { id: targetId }, select: { name: true, slug: true, userId: true } });
      return s && { title: s.name, link: `/magaza/${s.slug}`, ownerId: s.userId };
    }
    const r = await prisma.review.findUnique({ where: { id: targetId }, select: { comment: true, userId: true, product: { select: { slug: true } } } });
    return r && { title: r.comment.slice(0, 120), link: `/urun/${r.product.slug}`, ownerId: r.userId };
  },

  /** Haklı bulunan şikâyette içeriği kaldırır */
  takeDown(db: DbClient, targetType: ComplaintTarget, targetId: string) {
    if (targetType === 'PRODUCT') return db.product.update({ where: { id: targetId }, data: { isListed: false } });
    if (targetType === 'STORE') return db.store.update({ where: { id: targetId }, data: { isActive: false } });
    return db.review.delete({ where: { id: targetId } });
  },
};
