import { SellerRequestStatus } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { ResolveAction } from './seller-request.types';

export const sellerRequestRepository = {
  findPendingByUser(userId: string) {
    return prisma.sellerRequest.findFirst({ where: { userId, status: 'PENDING' } });
  },

  create(userId: string, reason: string) {
    return prisma.sellerRequest.create({
      data: { userId, reason },
      select: { id: true, reason: true, status: true, adminNotes: true, createdAt: true, updatedAt: true },
    });
  },

  findByUser(userId: string) {
    return prisma.sellerRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, reason: true, status: true, adminNotes: true, createdAt: true, updatedAt: true },
    });
  },

  findMany(status?: SellerRequestStatus) {
    return prisma.sellerRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true, canSell: true, createdAt: true } } },
    });
  },

  findById(id: string) {
    return prisma.sellerRequest.findUnique({ where: { id } });
  },

  /** Başvuruyu yalnızca hâlâ PENDING ise sonuçlandırır (çift işlem koruması) */
  resolve(id: string, userId: string, action: ResolveAction, adminNotes?: string) {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.sellerRequest.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: action, adminNotes },
      });
      if (count === 0) return null;
      if (action === 'APPROVED') {
        await tx.user.update({ where: { id: userId }, data: { canSell: true, sellerApprovedAt: new Date() } });
      }
      return tx.sellerRequest.findUnique({ where: { id } });
    });
  },
};
