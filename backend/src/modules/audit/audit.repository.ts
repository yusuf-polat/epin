import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { toSkip } from '@/utils/pagination';
import { AuditEntry, AuditListQuery } from './audit.types';

export const auditRepository = {
  create(entry: AuditEntry) {
    return prisma.auditLog.create({
      data: { ...entry, metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue | undefined },
    });
  },

  async findMany(query: AuditListQuery) {
    const and: Prisma.AuditLogWhereInput[] = [];
    if (query.action) and.push({ action: { startsWith: query.action } });
    if (query.targetType) and.push({ targetType: query.targetType });
    if (query.actorId) and.push({ actorId: query.actorId });
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      and.push({ OR: [{ summary: contains }, { targetId: contains }, { actor: { email: contains } }] });
    }
    const where: Prisma.AuditLogWhereInput = { AND: and };
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: toSkip(query),
        take: query.limit,
        include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { items, total };
  },
};
