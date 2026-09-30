import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { PageParams, toSkip } from '@/utils/pagination';
import { productCardInclude, visibleProductWhere } from '@/modules/products/product.repository';

/** Herkese açık mağaza sahibi bilgisi: e-posta gibi kişisel veriler hariç */
const publicOwnerSelect = { id: true, name: true, avatarUrl: true, createdAt: true } satisfies Prisma.UserSelect;

export const storeRepository = {
  findByUserId(userId: string) {
    return prisma.store.findUnique({ where: { userId } });
  },

  findMine(userId: string) {
    return prisma.store.findUnique({ where: { userId }, include: { owner: { select: publicOwnerSelect } } });
  },

  findBySlug(slug: string) {
    return prisma.store.findUnique({ where: { slug }, include: { owner: { select: { ...publicOwnerSelect, isBanned: true } } } });
  },

  findById(id: string) {
    return prisma.store.findUnique({ where: { id } });
  },

  findByNameOrSlug(name: string, slug: string) {
    return prisma.store.findFirst({ where: { OR: [{ name: { equals: name, mode: 'insensitive' } }, { slug }] } });
  },

  create(data: Prisma.StoreUncheckedCreateInput) {
    return prisma.store.create({ data, include: { owner: { select: publicOwnerSelect } } });
  },

  update(id: string, data: Prisma.StoreUpdateInput) {
    return prisma.store.update({ where: { id }, data, include: { owner: { select: publicOwnerSelect } } });
  },

  async findMany(page: PageParams, options: { search?: string; onlyActive: boolean }) {
    const where: Prisma.StoreWhereInput = {
      ...(options.onlyActive ? { isActive: true, owner: { isBanned: false } } : {}),
      ...(options.search
        ? {
            OR: [
              { name: { contains: options.search, mode: 'insensitive' } },
              { description: { contains: options.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      prisma.store.count({ where }),
      prisma.store.findMany({
        where,
        skip: toSkip(page),
        take: page.limit,
        orderBy: { createdAt: 'desc' },
        include: { owner: { select: options.onlyActive ? publicOwnerSelect : { ...publicOwnerSelect, email: true } } },
      }),
    ]);
    return { total, items };
  },

  /** Birden fazla satıcı için istatistikleri toplu hesaplar (N+1 sorgu yerine) */
  async statsForSellers(sellerIds: string[]) {
    if (sellerIds.length === 0) return new Map<string, { totalSales: number; activeListings: number; avgRating: number | null; reviewCount: number }>();

    const [sales, listings, ratings] = await Promise.all([
      prisma.$queryRaw<{ sellerId: string; count: bigint }[]>`
        SELECT p."sellerId", COUNT(dp.id) AS count
        FROM "digital_pins" dp
        JOIN "product_variants" v ON v.id = dp."variantId"
        JOIN "products" p ON p.id = v."productId"
        WHERE dp.status = 'SOLD' AND p."sellerId" IN (${Prisma.join(sellerIds)})
        GROUP BY p."sellerId"`,
      prisma.product.groupBy({
        by: ['sellerId'],
        where: { sellerId: { in: sellerIds }, approvalStatus: 'APPROVED', isActive: true, isListed: true },
        _count: { _all: true },
      }),
      prisma.$queryRaw<{ sellerId: string; avg: number | null; count: bigint }[]>`
        SELECT p."sellerId", AVG(r.rating)::float AS avg, COUNT(r.id) AS count
        FROM "reviews" r
        JOIN "products" p ON p.id = r."productId"
        WHERE p."sellerId" IN (${Prisma.join(sellerIds)})
        GROUP BY p."sellerId"`,
    ]);

    const salesBy = new Map(sales.map((s) => [s.sellerId, Number(s.count)]));
    const listingsBy = new Map(listings.map((l) => [l.sellerId, l._count._all]));
    const ratingsBy = new Map(ratings.map((r) => [r.sellerId, r]));

    return new Map(
      sellerIds.map((id) => {
        const rating = ratingsBy.get(id);
        return [
          id,
          {
            totalSales: salesBy.get(id) ?? 0,
            activeListings: listingsBy.get(id) ?? 0,
            avgRating: rating?.avg !== null && rating?.avg !== undefined ? Number(rating.avg.toFixed(1)) : null,
            reviewCount: rating ? Number(rating.count) : 0,
          },
        ];
      })
    );
  },

  async findProducts(sellerId: string, page: PageParams) {
    const where: Prisma.ProductWhereInput = { AND: [visibleProductWhere, { sellerId }] };
    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({ where, skip: toSkip(page), take: page.limit, orderBy: { createdAt: 'desc' }, include: productCardInclude }),
    ]);
    return { total, items };
  },
};
