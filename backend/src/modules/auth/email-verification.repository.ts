import { DbClient, prisma } from '@/config/prisma';

export const emailVerificationRepository = {
  /** Kullanıcının önceki bağlantılarını geçersiz kılıp yenisini oluşturur */
  async replaceToken(userId: string, tokenHash: string, expiresAt: Date) {
    await prisma.$transaction([
      prisma.emailVerificationToken.deleteMany({ where: { userId } }),
      prisma.emailVerificationToken.create({ data: { userId, tokenHash, expiresAt } }),
    ]);
  },

  findValid(tokenHash: string) {
    return prisma.emailVerificationToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userId: true },
    });
  },

  async consume(db: DbClient, id: string) {
    const { count } = await db.emailVerificationToken.updateMany({ where: { id, usedAt: null }, data: { usedAt: new Date() } });
    return count > 0;
  },

  markVerified(db: DbClient, userId: string) {
    return db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() }, select: { id: true } });
  },
};
