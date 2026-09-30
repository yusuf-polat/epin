import { DbClient, prisma } from '@/config/prisma';

export const twoFactorRepository = {
  findSecret(userId: string) {
    return prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, password: true, twoFactorSecret: true } });
  },

  /** 2FA'yı açar ve kurtarma kodlarını (özetleri) yeniler */
  async enable(db: DbClient, userId: string, encryptedSecret: string, codeHashes: string[], lastStep: number) {
    await db.user.update({ where: { id: userId }, data: { twoFactorSecret: encryptedSecret, twoFactorEnabledAt: new Date(), twoFactorLastStep: lastStep } });
    await db.twoFactorRecoveryCode.deleteMany({ where: { userId } });
    await db.twoFactorRecoveryCode.createMany({ data: codeHashes.map((codeHash) => ({ userId, codeHash })) });
  },

  async disable(db: DbClient, userId: string) {
    await db.user.update({ where: { id: userId }, data: { twoFactorSecret: null, twoFactorEnabledAt: null, twoFactorLastStep: null } });
    await db.twoFactorRecoveryCode.deleteMany({ where: { userId } });
  },

  async replaceRecoveryCodes(db: DbClient, userId: string, codeHashes: string[]) {
    await db.twoFactorRecoveryCode.deleteMany({ where: { userId } });
    await db.twoFactorRecoveryCode.createMany({ data: codeHashes.map((codeHash) => ({ userId, codeHash })) });
  },

  /** Kullanılmamış kurtarma kodunu tek seferlik tüketir */
  async consumeRecoveryCode(userId: string, codeHash: string) {
    const { count } = await prisma.twoFactorRecoveryCode.updateMany({ where: { userId, codeHash, usedAt: null }, data: { usedAt: new Date() } });
    return count > 0;
  },

  /**
   * TOTP adımını atomik olarak tüketir: yalnızca son kullanılandan yeni bir adım kabul edilir.
   * Böylece aynı kod (veya daha eski bir kod) ikinci kez kullanılamaz.
   */
  async claimStep(userId: string, step: number) {
    const { count } = await prisma.user.updateMany({
      where: { id: userId, OR: [{ twoFactorLastStep: null }, { twoFactorLastStep: { lt: step } }] },
      data: { twoFactorLastStep: step },
    });
    return count > 0;
  },

  countUnusedRecoveryCodes(userId: string) {
    return prisma.twoFactorRecoveryCode.count({ where: { userId, usedAt: null } });
  },
};
