import { Role } from '@prisma/client';
import { withTransaction } from '@/database/transaction';
import { getCachedData, invalidateCache, setCachedData } from '@/config/redis';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/utils/errors';
import { slugify } from '@/utils/slugify';
import { toNumber } from '@/utils/money';
import { notificationService } from '@/modules/notifications/notification.service';
import { hasPermission } from '@/modules/permissions/permission.service';
import { storeRepository } from '@/modules/stores/store.repository';
import { categoryRepository } from '@/modules/categories/category.repository';
import { productRepository } from './product.repository';
import { mapProduct } from './product.mapper';
import { DETAIL_CACHE_TTL as DETAIL_TTL, LIST_CACHE_TTL as LIST_TTL } from './product.constants';
import { AddCodesDTO, AdminProductListQuery, CreateListingDTO, CreateProductDTO, ProductListQuery, UpdateListingDTO } from './product.types';
import { ListingContent, needsReapproval } from './product.rules';


export const clearProductCache = (...slugs: string[]) =>
  invalidateCache('cache:products:*', ...(slugs.length ? slugs.map((s) => `cache:product:${s}`) : ['cache:product:*']));

interface Requester {
  id: string;
  role: Role;
}

/** Kod listesini temizler: boşlukları kırpar, boşları ve tekrarları atar */
function normalizeCodes(codes: string[]) {
  return [...new Set(codes.map((c) => c.trim()).filter(Boolean))];
}

async function canManageProducts(user: Requester) {
  return user.role === 'ADMIN' || (await hasPermission(user.role, 'manage_products'));
}

export const productService = {
  async list(query: ProductListQuery) {
    const cacheable = !query.search && query.page === 1;
    const key = `cache:products:${JSON.stringify(query)}`;
    if (cacheable) {
      const cached = await getCachedData<{ total: number; items: unknown[] }>(key);
      if (cached) return cached;
    }
    const { total, items } = await productRepository.findVisible(query);
    const result = { total, items: items.map(mapProduct) };
    if (cacheable) await setCachedData(key, result, LIST_TTL);
    return result;
  },

  async getBySlug(slug: string, requester?: Requester) {
    const product = await productRepository.findBySlug(slug);
    if (!product) throw new NotFoundError('Ürün bulunamadı', 'PRODUCT_NOT_FOUND');

    const isPublic =
      product.approvalStatus === 'APPROVED' &&
      product.isActive &&
      product.isListed &&
      (!product.seller || (!product.seller.isBanned && product.seller.store?.isActive !== false));

    if (!isPublic) {
      const isOwner = requester?.id === product.sellerId;
      const isStaff = requester?.role === 'ADMIN' || requester?.role === 'DESTEK';
      if (!isOwner && !isStaff) throw new NotFoundError('Ürün bulunamadı', 'PRODUCT_NOT_FOUND');
      return this.buildDetail(product);
    }

    const key = `cache:product:${slug}`;
    const cached = await getCachedData<unknown>(key);
    if (cached) return cached;
    const detail = await this.buildDetail(product);
    await setCachedData(key, detail, DETAIL_TTL);
    return detail;
  },

  async buildDetail(product: NonNullable<Awaited<ReturnType<typeof productRepository.findBySlug>>>) {
    const { seller, ...rest } = product;
    const store = seller?.store
      ? { ...seller.store, stats: await productRepository.sellerStats(seller.id) }
      : null;
    return {
      ...mapProduct(rest),
      seller: seller ? { id: seller.id, name: seller.name, avatarUrl: seller.avatarUrl, role: seller.role } : null,
      store,
    };
  },

  // ─── Platform ürünleri (yönetim) ──────────────────────────────────────────

  async createPlatformProduct(dto: CreateProductDTO) {
    const category = await categoryRepository.findById(dto.categoryId);
    if (!category) throw new NotFoundError('Seçilen kategori bulunamadı', 'CATEGORY_NOT_FOUND');
    const created = await productRepository.createWithVariants(dto);
    await clearProductCache();
    return created;
  },

  // ─── Satıcı ilanları ──────────────────────────────────────────────────────

  async createListing(sellerId: string, dto: CreateListingDTO) {
    const store = await storeRepository.findByUserId(sellerId);
    if (!store || !store.isActive) {
      throw new BadRequestError('İlan yayınlayabilmek için aktif bir mağazanız olmalıdır', 'STORE_REQUIRED');
    }
    const category = await categoryRepository.findById(dto.categoryId);
    if (!category) throw new NotFoundError('Seçilen kategori bulunamadı', 'CATEGORY_NOT_FOUND');

    const isInstant = dto.deliveryType === 'INSTANT';
    const codes = normalizeCodes(dto.codes ?? []);
    if (isInstant && codes.length === 0) {
      throw new BadRequestError('Anında teslimatlı ürünler için en az 1 adet dijital kod girmelisiniz', 'CODES_REQUIRED');
    }

    const deliveryDeadlineHours = isInstant ? 1 : dto.deliveryDeadlineHours;
    const gallery = dto.galleryUrls ?? [];
    const brand = dto.brand?.trim() || category.name;
    const slug = `${slugify(dto.title) || 'ilan'}-${Date.now().toString(36)}${Math.floor(100 + Math.random() * 900)}`;

    const product = await withTransaction(async (tx) => {
      const created = await productRepository.createListing(tx, {
        title: dto.title,
        slug,
        description: dto.description,
        shortDesc: isInstant
          ? `${brand} - Kullanıcı Pazarı Anında Teslimat`
          : `${brand} - Satıcı Manuel Teslimatı (${deliveryDeadlineHours} Saat)`,
        categoryId: dto.categoryId,
        imageUrl: dto.imageUrl || gallery[0] || category.imageUrl,
        galleryUrls: gallery,
        brand,
        region: dto.region,
        instantDelivery: isInstant,
        deliveryType: dto.deliveryType,
        deliveryDeadlineHours,
        deliveryInstructions: dto.deliveryInstructions || null,
        isMarketplace: true,
        sellerId,
        approvalStatus: 'PENDING',
        slaDeliverySeconds: isInstant ? 0.18 : deliveryDeadlineHours * 3600,
      });
      const variant = await productRepository.createVariant(tx, {
        productId: created.id,
        title: dto.title,
        denomination: `₺${dto.price.toFixed(2)}`,
        price: dto.price,
        originalPrice: dto.originalPrice ?? null,
        stockCount: isInstant ? codes.length : dto.stockCount,
      });
      if (isInstant) await productRepository.createPins(tx, variant.id, codes);
      return created;
    });

    await notificationService.send({
      userId: sellerId,
      type: 'PRODUCT',
      title: 'İlanınız İncelemeye Alındı',
      message: `"${dto.title}" başlıklı ilanınız oluşturuldu. Destek ekibimiz onayladığında yayına girecektir.`,
      link: '/hesabim/pazar',
    });
    await notificationService.notifyStaff({
      type: 'PRODUCT',
      title: 'Onay Bekleyen Yeni İlan',
      message: `"${dto.title}" başlıklı ilan onay bekliyor.`,
      link: '/panel/urunler',
    });
    return product;
  },

  async listSellerListings(sellerId: string) {
    const { products, soldCounts, revenues } = await productRepository.findSellerListings(sellerId);
    const soldBy = new Map(soldCounts.map((s) => [s.variantId, s._count._all]));
    const revenueBy = new Map(revenues.map((r) => [r.variantId, r._sum]));

    return products.map((p) => {
      const variants = p.variants.map((v) => {
        const available = p.deliveryType === 'MANUAL' ? v.stockCount : v._count.pins;
        const revenue = revenueBy.get(v.id);
        return {
          id: v.id,
          title: v.title,
          denomination: v.denomination,
          price: toNumber(v.price),
          originalPrice: v.originalPrice ? toNumber(v.originalPrice) : null,
          availableStock: available,
          soldCount: p.deliveryType === 'MANUAL' ? revenue?.quantity ?? 0 : soldBy.get(v.id) ?? 0,
          revenue: toNumber(revenue?.totalPrice),
        };
      });
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        imageUrl: p.imageUrl,
        brand: p.brand,
        region: p.region,
        deliveryType: p.deliveryType,
        deliveryDeadlineHours: p.deliveryDeadlineHours,
        approvalStatus: p.approvalStatus,
        rejectedReason: p.rejectedReason,
        isActive: p.isActive,
        isListed: p.isListed,
        galleryUrls: p.galleryUrls,
        createdAt: p.createdAt,
        category: p.category,
        variants,
        totalAvailable: variants.reduce((s, v) => s + v.availableStock, 0),
        totalSold: variants.reduce((s, v) => s + v.soldCount, 0),
        totalRevenue: variants.reduce((s, v) => s + v.revenue, 0),
      };
    });
  },

  /** Düzenleme formu için ilanın mevcut değerleri (yalnızca sahibi veya yetkili) */
  async getListingForEdit(productId: string, user: Requester) {
    const product = await this.getManageableProduct(productId, user);
    const variant = product.variants[0];
    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      description: product.description,
      categoryId: product.categoryId,
      brand: product.brand,
      region: product.region,
      imageUrl: product.imageUrl,
      galleryUrls: product.galleryUrls,
      deliveryType: product.deliveryType,
      deliveryDeadlineHours: product.deliveryDeadlineHours,
      deliveryInstructions: product.deliveryInstructions,
      approvalStatus: product.approvalStatus,
      isActive: product.isActive,
      isListed: product.isListed,
      price: toNumber(variant?.price),
      originalPrice: variant?.originalPrice ? toNumber(variant.originalPrice) : null,
    };
  },

  /**
   * İlanı günceller. Satıcı içerik alanlarını (başlık, açıklama, görsel...)
   * değiştirirse ilan yeniden onaya düşer; yalnızca fiyat/teslim süresi
   * değişikliği yayını etkilemez. Teslimat tipi sonradan değiştirilemez.
   */
  async updateListing(productId: string, user: Requester, dto: UpdateListingDTO) {
    const product = await this.getManageableProduct(productId, user);
    if (!product.isActive) throw new BadRequestError('Satışa kapatılmış ilan düzenlenemez', 'LISTING_CLOSED');
    const variant = product.variants[0];
    if (!variant) throw new NotFoundError('İlan paketi bulunamadı', 'VARIANT_NOT_FOUND');

    const category = dto.categoryId === product.categoryId ? null : await categoryRepository.findById(dto.categoryId);
    if (dto.categoryId !== product.categoryId && !category) throw new NotFoundError('Seçilen kategori bulunamadı', 'CATEGORY_NOT_FOUND');

    const after: ListingContent = {
      title: dto.title,
      description: dto.description,
      categoryId: dto.categoryId,
      brand: dto.brand || product.brand,
      region: dto.region,
      // Galeri boşaltılırsa mevcut kapak görseli korunur
      imageUrl: dto.galleryUrls[0] ?? product.imageUrl,
      galleryUrls: dto.galleryUrls,
      deliveryInstructions: dto.deliveryInstructions || null,
    };
    const isOwnerEdit = product.sellerId === user.id;
    const reapprove = isOwnerEdit && product.approvalStatus !== 'PENDING' && needsReapproval(product, after);
    const deadline = product.deliveryType === 'MANUAL' ? dto.deliveryDeadlineHours ?? product.deliveryDeadlineHours : product.deliveryDeadlineHours;

    const updated = await withTransaction(async (tx) => {
      const saved = await productRepository.updateProduct(tx, product.id, {
        ...after,
        deliveryDeadlineHours: deadline,
        ...(product.deliveryType === 'MANUAL' ? { slaDeliverySeconds: deadline * 3600 } : {}),
        ...(reapprove ? { approvalStatus: 'PENDING', approvedAt: null, rejectedReason: null } : {}),
      });
      await productRepository.updateVariant(tx, variant.id, {
        title: dto.title,
        denomination: `₺${dto.price.toFixed(2)}`,
        price: dto.price,
        originalPrice: dto.originalPrice,
      });
      return saved;
    });

    await clearProductCache(product.slug);
    if (reapprove) {
      await notificationService.notifyStaff({
        type: 'PRODUCT',
        title: 'Düzenlenen İlan Onay Bekliyor',
        message: `"${dto.title}" başlıklı ilan düzenlendi ve yeniden onay bekliyor.`,
        link: '/panel/urunler',
      });
    }
    return { id: updated.id, slug: updated.slug, approvalStatus: updated.approvalStatus, requiresApproval: reapprove };
  },

  /** İlan sahibi veya ürün yönetimi yetkisi olan personel işlem yapabilir */
  async getManageableProduct(productId: string, user: Requester) {
    const product = await productRepository.findById(productId);
    if (!product) throw new NotFoundError('İlan bulunamadı', 'PRODUCT_NOT_FOUND');
    if (product.sellerId !== user.id && !(await canManageProducts(user))) {
      throw new ForbiddenError('Bu ilan üzerinde işlem yetkiniz yok');
    }
    return product;
  },

  async removeListing(productId: string, user: Requester) {
    const product = await this.getManageableProduct(productId, user);
    const hasSales = (await productRepository.countOrderItems(productId)) > 0;
    if (hasSales) {
      await productRepository.closeListing(productId);
    } else {
      await productRepository.delete(productId);
    }
    await clearProductCache(product.slug);
    return { closed: hasSales, deleted: !hasSales };
  },

  /** İlanı geri alınabilir şekilde yayından kaldırır / yeniden yayına alır; stok ve kodlar korunur */
  async setListed(productId: string, user: Requester, isListed: boolean) {
    const product = await this.getManageableProduct(productId, user);
    if (!product.isActive) throw new BadRequestError('Satışa kapatılmış ilan yayına alınamaz', 'LISTING_CLOSED');
    if (product.isListed !== isListed) {
      await productRepository.setListed(productId, isListed);
      await clearProductCache(product.slug);
    }
    return { isListed };
  },

  async addCodes(productId: string, user: Requester, dto: AddCodesDTO) {
    const product = await this.getManageableProduct(productId, user);
    if (product.deliveryType !== 'INSTANT') {
      throw new BadRequestError('Manuel teslimatlı ilanlara kod eklenemez; stok adedini güncelleyiniz', 'NOT_INSTANT');
    }
    if (!product.isActive) throw new BadRequestError('Kapatılmış ilana kod eklenemez', 'LISTING_CLOSED');

    const variant = dto.variantId ? product.variants.find((v) => v.id === dto.variantId) : product.variants[0];
    if (!variant) throw new NotFoundError('İlan paketi bulunamadı', 'VARIANT_NOT_FOUND');

    const codes = normalizeCodes(dto.codes);
    const existing = new Set((await productRepository.findExistingCodes(variant.id, codes)).map((p) => p.code));
    const fresh = codes.filter((c) => !existing.has(c));
    if (fresh.length === 0) throw new BadRequestError('Girilen kodların tamamı zaten sistemde kayıtlı', 'DUPLICATE_CODES');

    await withTransaction(async (tx) => {
      await productRepository.createPins(tx, variant.id, fresh);
      await productRepository.incrementStock(tx, variant.id, fresh.length);
    });
    await clearProductCache(product.slug);
    return { addedCount: fresh.length, skippedCount: dto.codes.length - fresh.length };
  },

  async setStock(productId: string, user: Requester, stockCount: number) {
    const product = await this.getManageableProduct(productId, user);
    if (product.deliveryType !== 'MANUAL') {
      throw new BadRequestError('Anında teslimatlı ilanlarda stok, eklenen kod sayısıdır', 'NOT_MANUAL');
    }
    if (!product.isActive) throw new BadRequestError('Kapatılmış ilanın stoğu güncellenemez', 'LISTING_CLOSED');
    const variant = product.variants[0];
    if (!variant) throw new NotFoundError('İlan paketi bulunamadı', 'VARIANT_NOT_FOUND');
    await productRepository.setStock(variant.id, stockCount);
    await clearProductCache(product.slug);
    return { stockCount };
  },

  // ─── Onay süreci ──────────────────────────────────────────────────────────

  async listForAdmin(query: AdminProductListQuery) {
    const { total, items } = await productRepository.findForAdmin(query);
    return { total, items: items.map((p) => mapProduct({ ...p, reviews: [] })) };
  },

  async approve(productId: string, reviewerId: string) {
    const existing = await productRepository.findById(productId);
    if (!existing) throw new NotFoundError('Ürün bulunamadı', 'PRODUCT_NOT_FOUND');
    const updated = await productRepository.updateApproval(productId, 'APPROVED', reviewerId);
    if (updated.sellerId) {
      await notificationService.send({
        userId: updated.sellerId,
        type: 'PRODUCT',
        title: 'İlanınız Yayına Alındı',
        message: `"${updated.title}" başlıklı ilanınız incelendi ve onaylandı. Artık satışta!`,
        link: `/urun/${updated.slug}`,
      });
    }
    await clearProductCache(updated.slug);
    return updated;
  },

  async reject(productId: string, reviewerId: string, reason: string) {
    const existing = await productRepository.findById(productId);
    if (!existing) throw new NotFoundError('Ürün bulunamadı', 'PRODUCT_NOT_FOUND');
    const updated = await productRepository.updateApproval(productId, 'REJECTED', reviewerId, reason);
    if (updated.sellerId) {
      await notificationService.send({
        userId: updated.sellerId,
        type: 'PRODUCT',
        title: 'İlanınız Reddedildi',
        message: `"${updated.title}" başlıklı ilanınız onaylanmadı. Gerekçe: ${reason}`,
        link: '/hesabim/pazar',
      });
    }
    await clearProductCache(updated.slug);
    return updated;
  },
};
