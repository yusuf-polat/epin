import { DbClient, prisma } from '@/config/prisma';

export const passwordResetRepository = {
  /** Kullanıcının önceki tüm token'larını silip yenisini oluşturur (tek geçerli bağlantı) */
  async replaceToken(userId: string, tokenHash: string, expiresAt: Date) {
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId } }),
      prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } }),
    ]);
  },

  findValid(tokenHash: string) {
    return prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userId: true },
    });
  },

  /** Token'ı yalnızca bir kez kullanılabilecek şekilde işaretler */
  async consume(db: DbClient, id: string) {
    const { count } = await db.passwordResetToken.updateMany({ where: { id, usedAt: null }, data: { usedAt: new Date() } });
    return count > 0;
  },

  deleteForUser(db: DbClient, userId: string) {
    return db.passwordResetToken.deleteMany({ where: { userId } });
  },
};
