import { describe, expect, it } from 'vitest';
import { listingChanges } from '@/features/products/utils';
import type { EditableListing } from '@/features/products/types';
import type { EditListingValues } from '@/features/products/schemas/product.schema';

const listing: EditableListing = {
  id: 'p1',
  slug: 'ilan',
  title: 'Valorant 1000 VP',
  description: 'Açıklama metni',
  categoryId: 'c1',
  brand: 'Riot',
  region: 'TR',
  imageUrl: '/uploads/a.png',
  galleryUrls: ['/uploads/a.png'],
  deliveryType: 'INSTANT',
  deliveryDeadlineHours: 1,
  deliveryInstructions: null,
  approvalStatus: 'APPROVED',
  isActive: true,
  isListed: true,
  price: 100,
  originalPrice: null,
};

const values = (over: Partial<EditListingValues> = {}): EditListingValues => ({
  title: listing.title,
  categoryId: listing.categoryId,
  brand: listing.brand,
  region: 'TR',
  description: listing.description,
  price: listing.price,
  originalPrice: undefined,
  images: listing.galleryUrls,
  deadlineHours: 1,
  instructions: '',
  ...over,
});

const names = (id: string) => ({ c1: 'Oyun', c2: 'Hediye Kartı' })[id] ?? '—';

describe('listingChanges', () => {
  it('değişiklik yoksa boş döner', () => {
    expect(listingChanges(listing, values(), names)).toEqual([]);
  });

  it('fiyat değişikliği onay gerektirmez', () => {
    const changes = listingChanges(listing, values({ price: 90 }), names);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ label: 'Satış fiyatı', reapproval: false });
  });

  it('içerik değişiklikleri onay gerektirir, kategori adıyla gösterilir', () => {
    const changes = listingChanges(listing, values({ title: 'Yeni Başlık', categoryId: 'c2', images: [] }), names);
    expect(changes.map((c) => c.label)).toEqual(['Başlık', 'Kategori', 'Görseller']);
    expect(changes.every((c) => c.reapproval)).toBe(true);
    expect(changes[1]).toMatchObject({ before: 'Oyun', after: 'Hediye Kartı' });
  });

  it('boş marka mevcut markayı korur, anında teslimatta teslim süresi karşılaştırılmaz', () => {
    expect(listingChanges(listing, values({ brand: '', deadlineHours: 48 }), names)).toEqual([]);
  });
});
