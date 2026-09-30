import { Prisma, ProductApprovalStatus } from '@prisma/client';
import { DbClient, prisma } from '@/config/prisma';
import { toSkip } from '@/utils/pagination';
import { AdminProductListQuery, CreateProductDTO, ProductListQuery } from './product.types';

/** Vitrinde gösterilebilir ürün: onaylı, aktif, yayında ve satıcısı (varsa) askıda olmayan/mağazası açık */
export const visibleProductWhere: Prisma.ProductWhereInput = {
  approvalStatus: 'APPROVED',
  isActive: true,
  isListed: true,
  OR: [{ sellerId: null }, { seller: { isBanned: false, store: { isActive: true } } }],
};

export const productCardInclude = {
  category: { select: { id: true, name: true, slug: true } },
  seller: { select: { id: true, name: true, avatarUrl: true, role: true, store: { select: { name: true, slug: true } } } },
  reviews: { select: { rating: true } },
  variants: {
    orderBy: { price: 'asc' },
    include: { _count: { select: { pins: { where: { status: 'AVAILABLE' } } } } },
  },
} satisfies Prisma.ProductInclude;

export type ProductCardRecord = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

function searchWhere(search?: string): Prisma.ProductWhereInput | undefined {
  if (!search) return undefined;
  return {
    OR: [
      { title: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ],
  };
}

export const productRepository = {
  async findVisible(query: ProductListQuery) {
    const and: Prisma.ProductWhereInput[] = [visibleProductWhere];
    if (query.category) and.push({ category: { slug: query.category } });
    if (query.brand) and.push({ brand: { equals: query.brand, mode: 'insensitive' } });
    // GLOBAL kodlar her bölgede çalıştığı için bölge filtresinde de listelenir
    if (query.region) and.push({ region: { in: query.region === 'GLOBAL' ? ['GLOBAL'] : [query.region, 'GLOBAL'] } });
    if (query.featured !== undefined) and.push({ isFeatured: query.featured });
    if (query.popular !== undefined) and.push({ isPopular: query.popular });
    if (query.isMarketplace !== undefined) and.push({ isMarketplace: query.isMarketplace });
    if (query.delivery) and.push({ deliveryType: query.delivery });
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      and.push({ variants: { some: { price: { gte: query.minPrice, lte: query.maxPrice } } } });
    }
    const search = searchWhere(query.search);
    if (search) and.push(search);

    const where: Prisma.ProductWhereInput = { AND: and };
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      query.sort === 'newest'
        ? [{ createdAt: 'desc' }]
        : [{ isPopular: 'desc' }, { isFeatured: 'desc' }, { createdAt: 'desc' }];

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({ where, skip: toSkip(query), take: query.limit, orderBy, include: productCardInclude }),
    ]);
    return { total, items };
  },

  findBySlug(slug: string) {
    return prisma.product.findUnique({
      where: { slug },
      include: {
        ...productCardInclude,
        category: true,
        seller: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            role: true,
            isBanned: true,
            store: { select: { id: true, name: true, slug: true, description: true, logoUrl: true, coverUrl: true, isActive: true, createdAt: true } },
          },
        },
      },
    });
  },

  findById(id: string) {
    return prisma.product.findUnique({ where: { id }, include: { variants: true } });
  },

  async sellerStats(sellerId: string) {
    const [totalSales, ratings] = await Promise.all([
      prisma.digitalPin.count({ where: { status: 'SOLD', variant: { product: { sellerId } } } }),
      prisma.review.aggregate({ where: { product: { sellerId } }, _avg: { rating: true }, _count: { rating: true } }),
    ]);
    return { totalSales, avgRating: ratings._avg.rating, reviewCount: ratings._count.rating };
  },

  createWithVariants(dto: CreateProductDTO) {
    const { variants, ...data } = dto;
    return prisma.product.create({
      data: {
        ...data,
        instantDelivery: data.deliveryType === 'INSTANT',
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        variants: { create: variants.map((v) => ({ ...v, stockCount: 0 })) },
      },
      include: { variants: true },
    });
  },

  createListing(db: DbClient, data: Prisma.ProductUncheckedCreateInput) {
    return db.product.create({ data });
  },

  updateProduct(db: DbClient, id: string, data: Prisma.ProductUncheckedUpdateInput) {
    return db.product.update({ where: { id }, data });
  },

  updateVariant(db: DbClient, id: string, data: Prisma.ProductVariantUncheckedUpdateInput) {
    return db.productVariant.update({ where: { id }, data });
  },

  createVariant(db: DbClient, data: Prisma.ProductVariantUncheckedCreateInput) {
    return db.productVariant.create({ data });
  },

  findExistingCodes(variantId: string, codes: string[]) {
    return prisma.digitalPin.findMany({
      where: { variantId, code: { in: codes } },
      select: { code: true },
    });
  },

  createPins(db: DbClient, variantId: string, codes: string[]) {
    const stamp = Date.now().toString().slice(-6);
    return db.digitalPin.createMany({
      data: codes.map((code, i) => ({ variantId, code, serialNumber: `PZR-${stamp}-${i + 1}`, status: 'AVAILABLE' as const })),
    });
  },

  incrementStock(db: DbClient, variantId: string, amount: number) {
    return db.productVariant.update({ where: { id: variantId }, data: { stockCount: { increment: amount } } });
  },

  setListed(productId: string, isListed: boolean) {
    return prisma.product.update({ where: { id: productId }, data: { isListed } });
  },

  setStock(variantId: string, stockCount: number) {
    return prisma.productVariant.update({ where: { id: variantId }, data: { stockCount } });
  },

  countOrderItems(productId: string) {
    return prisma.orderItem.count({ where: { variant: { productId } } });
  },

  /** Satış geçmişi olan ilan silinmez; satışa kapatılır ve satılmamış kodlar temizlenir */
  closeListing(productId: string) {
    return prisma.$transaction([
      prisma.digitalPin.deleteMany({ where: { variant: { productId }, status: 'AVAILABLE' } }),
      prisma.productVariant.updateMany({ where: { productId }, data: { stockCount: 0 } }),
      prisma.product.update({ where: { id: productId }, data: { isActive: false } }),
    ]);
  },

  delete(productId: string) {
    return prisma.product.delete({ where: { id: productId } });
  },

  async findSellerListings(sellerId: string) {
    const products = await prisma.product.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: { include: { _count: { select: { pins: { where: { status: 'AVAILABLE' } } } } } },
      },
    });
    const variantIds = products.flatMap((p) => p.variants.map((v) => v.id));
    const [soldCounts, revenues] = await Promise.all([
      prisma.digitalPin.groupBy({ by: ['variantId'], where: { variantId: { in: variantIds }, status: 'SOLD' }, _count: { _all: true } }),
      prisma.orderItem.groupBy({
        by: ['variantId'],
        where: { variantId: { in: variantIds }, order: { escrowStatus: { not: 'REFUNDED_TO_BUYER' } } },
        _sum: { totalPrice: true, quantity: true },
      }),
    ]);
    return { products, soldCounts, revenues };
  },

  updateApproval(productId: string, status: 'APPROVED' | 'REJECTED', reviewerId: string, reason?: string) {
    return prisma.product.update({
      where: { id: productId },
      data: {
        approvalStatus: status,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        approvedById: reviewerId,
        rejectedReason: status === 'REJECTED' ? reason : null,
      },
    });
  },

  async findForAdmin(query: AdminProductListQuery) {
    const and: Prisma.ProductWhereInput[] = [];
    if (query.status && query.status !== 'ALL') and.push({ approvalStatus: query.status as ProductApprovalStatus });
    const search = searchWhere(query.search);
    if (search) and.push(search);
    const where: Prisma.ProductWhereInput = { AND: and };

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: toSkip(query),
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, name: true, email: true, store: { select: { name: true, slug: true } } } },
          variants: { include: { _count: { select: { pins: { where: { status: 'AVAILABLE' } } } } } },
        },
      }),
    ]);
    return { total, items };
  },
};

