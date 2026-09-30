import { Prisma, Role } from '@prisma/client';
import { DbClient, prisma } from '@/config/prisma';
import { PageParams, toSkip } from '@/utils/pagination';

/** İstemciye dönen kullanıcı alanları (parola asla seçilmez) */
export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  canSell: true,
  walletBalance: true,
  avatarUrl: true,
  createdAt: true,
  emailVerifiedAt: true,
  twoFactorEnabledAt: true,
  store: { select: { id: true, name: true, slug: true, isActive: true } },
} satisfies Prisma.UserSelect;

export type PublicUserRecord = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export const userRepository = {
  findPublicById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
  },

  /** Kimlik doğrulama için minimal kullanıcı bilgisi */
  findAuthUser(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, canSell: true, isBanned: true, banReason: true, passwordChangedAt: true },
    });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data, select: publicUserSelect });
  },

  update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data, select: publicUserSelect });
  },

  async findManyForAdmin(page: PageParams, search?: string) {
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: toSkip(page),
        take: page.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          canSell: true,
          sellerApprovedAt: true,
          walletBalance: true,
          isBanned: true,
          bannedAt: true,
          banReason: true,
          createdAt: true,
          store: { select: { id: true, name: true, slug: true, isActive: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total };
  },

  /** Şifreyi değiştirir; bu andan önce üretilen tüm oturum token'ları geçersiz olur */
  setPassword(id: string, passwordHash: string, changedAt = new Date(), db: DbClient = prisma) {
    return db.user.update({ where: { id }, data: { password: passwordHash, passwordChangedAt: changedAt }, select: { id: true } });
  },

  setRole(id: string, role: Role) {
    return prisma.user.update({ where: { id }, data: { role }, select: { id: true, name: true, email: true, role: true } });
  },

  setSeller(id: string, canSell: boolean) {
    return prisma.user.update({
      where: { id },
      data: { canSell, sellerApprovedAt: canSell ? new Date() : null },
      select: { id: true, name: true, email: true, canSell: true, sellerApprovedAt: true },
    });
  },

  setBan(id: string, banned: boolean, reason?: string) {
    return prisma.user.update({
      where: { id },
      data: banned
        ? { isBanned: true, bannedAt: new Date(), banReason: reason }
        : { isBanned: false, bannedAt: null, banReason: null },
      select: { id: true, name: true, email: true, isBanned: true, banReason: true },
    });
  },
};
