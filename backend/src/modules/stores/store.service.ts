import { ConflictError, ForbiddenError, NotFoundError } from '@/utils/errors';
import { PageParams } from '@/utils/pagination';
import { userRepository } from '@/modules/users/user.repository';
import { mapProduct } from '@/modules/products/product.mapper';
import { clearProductCache } from '@/modules/products/product.service';
import { notificationService } from '@/modules/notifications/notification.service';
import { storeRepository } from './store.repository';
import { CreateStoreDTO, UpdateStoreDTO } from './store.types';

async function findPublicStore(slug: string) {
  const store = await storeRepository.findBySlug(slug.toLowerCase());
  if (!store || !store.isActive || store.owner.isBanned) throw new NotFoundError('Mağaza bulunamadı', 'STORE_NOT_FOUND');
  const { isBanned: _isBanned, ...owner } = store.owner;
  return { ...store, owner };
}

export const storeService = {
  async create(userId: string, dto: CreateStoreDTO) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
    if (!user.canSell && user.role !== 'ADMIN') {
      throw new ForbiddenError('Mağaza açabilmek için onaylı satıcı olmalısınız', 'SELLER_REQUIRED');
    }
    if (await storeRepository.findByUserId(userId)) throw new ConflictError('Zaten bir mağazanız bulunmaktadır', 'STORE_EXISTS');

    const clash = await storeRepository.findByNameOrSlug(dto.name, dto.slug);
    if (clash) {
      throw new ConflictError(
        clash.slug === dto.slug ? 'Bu mağaza URL adresi zaten kullanılıyor' : 'Bu mağaza adı zaten kullanılıyor',
        'STORE_NAME_TAKEN'
      );
    }
    return storeRepository.create({ ...dto, userId });
  },

  async update(userId: string, dto: UpdateStoreDTO) {
    const store = await storeRepository.findByUserId(userId);
    if (!store) throw new NotFoundError('Mağazanız bulunamadı', 'STORE_NOT_FOUND');
    return storeRepository.update(store.id, dto);
  },

  getMine(userId: string) {
    return storeRepository.findMine(userId);
  },

  async getBySlug(slug: string) {
    const store = await findPublicStore(slug);
    const stats = (await storeRepository.statsForSellers([store.userId])).get(store.userId)!;
    return { ...store, stats: { ...stats, memberSince: store.owner.createdAt } };
  },

  async listPublic(page: PageParams, search?: string) {
    const { total, items } = await storeRepository.findMany(page, { search, onlyActive: true });
    const stats = await storeRepository.statsForSellers(items.map((s) => s.userId));
    return { total, items: items.map((s) => ({ ...s, stats: stats.get(s.userId) })) };
  },

  async listForAdmin(page: PageParams, search?: string) {
    const { total, items } = await storeRepository.findMany(page, { search, onlyActive: false });
    const stats = await storeRepository.statsForSellers(items.map((s) => s.userId));
    return { total, items: items.map((s) => ({ ...s, stats: stats.get(s.userId) })) };
  },

  async listProducts(slug: string, page: PageParams) {
    const store = await findPublicStore(slug);
    const { total, items } = await storeRepository.findProducts(store.userId, page);
    return { total, items: items.map(mapProduct) };
  },

  async toggleActive(storeId: string) {
    const store = await storeRepository.findById(storeId);
    if (!store) throw new NotFoundError('Mağaza bulunamadı', 'STORE_NOT_FOUND');

    const updated = await storeRepository.update(storeId, { isActive: !store.isActive });
    await clearProductCache();
    await notificationService.send({
      userId: store.userId,
      type: 'SYSTEM',
      title: updated.isActive ? 'Mağazanız Yeniden Aktif' : 'Mağazanız Askıya Alındı',
      message: updated.isActive
        ? 'Mağazanız yeniden aktifleştirildi; ilanlarınız tekrar listeleniyor.'
        : 'Mağazanız yönetim tarafından askıya alındı. İlanlarınız listelenmeyecektir. Detay için destek ekibiyle iletişime geçiniz.',
      link: '/hesabim/destek',
    });
    return updated;
  },
};
