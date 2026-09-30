import { getCachedData, invalidateCache, setCachedData } from '@/config/redis';
import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError } from '@/utils/errors';
import { toNullableNumber } from '@/utils/money';
import { categoryRepository } from './category.repository';
import { CreateCategoryDTO, UpdateCategoryDTO } from './category.types';
import { CATEGORY_CACHE_TTL as CACHE_TTL, CATEGORIES_CACHE_KEY as ALL_KEY } from './category.constants';

/** Decimal komisyon oranını JSON için number'a çevirir */
const toView = <T extends { commissionRate: Prisma.Decimal | null }>(c: T) => ({ ...c, commissionRate: toNullableNumber(c.commissionRate) });

const clearCategoryCache = () => invalidateCache('cache:categories:*', 'cache:category:*', 'cache:products:*');

export const categoryService = {
  async list() {
    const cached = await getCachedData<ReturnType<typeof toView<Awaited<ReturnType<typeof categoryRepository.findAll>>[number]>>[]>(ALL_KEY);
    if (cached) return cached;
    const categories = (await categoryRepository.findAll()).map(toView);
    await setCachedData(ALL_KEY, categories, CACHE_TTL);
    return categories;
  },

  async getBySlug(slug: string) {
    const key = `cache:category:${slug}`;
    const cached = await getCachedData<ReturnType<typeof toView<NonNullable<Awaited<ReturnType<typeof categoryRepository.findBySlug>>>>>>(key);
    if (cached) return cached;
    const found = await categoryRepository.findBySlug(slug);
    if (!found) throw new NotFoundError('Kategori bulunamadı', 'CATEGORY_NOT_FOUND');
    const category = toView(found);
    await setCachedData(key, category, CACHE_TTL);
    return category;
  },

  async create(dto: CreateCategoryDTO) {
    const created = await categoryRepository.create(dto);
    await clearCategoryCache();
    return toView(created);
  },

  async update(id: string, dto: UpdateCategoryDTO) {
    const existing = await categoryRepository.findById(id);
    if (!existing) throw new NotFoundError('Kategori bulunamadı', 'CATEGORY_NOT_FOUND');
    const updated = await categoryRepository.update(id, dto);
    await clearCategoryCache();
    return toView(updated);
  },

  async remove(id: string) {
    const existing = await categoryRepository.findById(id);
    if (!existing) throw new NotFoundError('Kategori bulunamadı', 'CATEGORY_NOT_FOUND');
    // Kategori silinmesi ürünleri cascade ile sileceği için ürün içeren kategoriler korunur
    if (existing._count.products > 0) {
      throw new ConflictError(
        `Bu kategoride ${existing._count.products} ürün bulunuyor. Önce ürünleri başka kategoriye taşıyınız.`,
        'CATEGORY_NOT_EMPTY'
      );
    }
    await categoryRepository.delete(id);
    await clearCategoryCache();
  },
};
