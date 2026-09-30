import { describe, expect, it } from 'vitest';
import { changedContentFields, ListingContent, needsReapproval } from '@/modules/products/product.rules';

const base: ListingContent = {
  title: 'Valorant 1000 VP',
  description: 'TR bölgesi',
  categoryId: 'c1',
  brand: 'Riot',
  region: 'TR',
  imageUrl: '/a.png',
  galleryUrls: ['/a.png', '/b.png'],
  deliveryInstructions: null,
};

describe('ilan düzenleme onay kuralı', () => {
  it('içerik aynıysa (yalnızca fiyat değiştiyse) yeniden onay gerekmez', () => {
    expect(needsReapproval(base, { ...base, galleryUrls: ['/a.png', '/b.png'] })).toBe(false);
  });

  it('başlık, galeri sırası veya teslimat bilgisi değişirse yeniden onay gerekir', () => {
    expect(changedContentFields(base, { ...base, title: 'Yeni başlık' })).toEqual(['title']);
    expect(changedContentFields(base, { ...base, galleryUrls: ['/b.png', '/a.png'] })).toEqual(['galleryUrls']);
    expect(needsReapproval(base, { ...base, deliveryInstructions: 'Discord üzerinden teslim' })).toBe(true);
  });

  it('boş teslimat bilgisi null ile aynı kabul edilir', () => {
    expect(needsReapproval({ ...base, deliveryInstructions: undefined as unknown as null }, base)).toBe(false);
  });
});
