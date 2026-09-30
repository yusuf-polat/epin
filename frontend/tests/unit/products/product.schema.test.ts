import { describe, expect, it } from 'vitest';
import { LISTING_DEFAULTS, listingSchema, reviewSchema } from '@/features/products/schemas/product.schema';

const valid = { ...LISTING_DEFAULTS, title: 'Valorant 1000 VP', categoryId: 'c1', description: 'Türkiye bölgesi kod', price: '100', codesText: 'KOD-1\nKOD-2\nKOD-1' };
const issues = (input: object) => {
  const r = listingSchema.safeParse(input);
  return r.success ? {} : r.error.flatten().fieldErrors;
};

describe('listingSchema', () => {
  it('geçerli anında teslimat ilanını dönüştürür', () => {
    const r = listingSchema.parse(valid);
    expect(r.price).toBe(100);
    expect(r.originalPrice).toBeUndefined();
  });

  it('anında teslimatta kod ister', () => {
    expect(issues({ ...valid, codesText: '  \n ' })).toHaveProperty('codesText');
  });

  it('manuel teslimatta stok ve süre sınırlarını kontrol eder', () => {
    const manual = { ...valid, deliveryType: 'MANUAL', codesText: '' };
    expect(issues({ ...manual, stockCount: 0 })).toHaveProperty('stockCount');
    expect(issues({ ...manual, deadlineHours: 200 })).toHaveProperty('deadlineHours');
    expect(listingSchema.safeParse(manual).success).toBe(true);
  });

  it('liste fiyatı satış fiyatından yüksek olmalıdır', () => {
    expect(issues({ ...valid, originalPrice: '90' })).toHaveProperty('originalPrice');
    expect(listingSchema.parse({ ...valid, originalPrice: '120' }).originalPrice).toBe(120);
  });

  it('geçersiz fiyatı reddeder', () => {
    expect(issues({ ...valid, price: '0' })).toHaveProperty('price');
  });
});

describe('reviewSchema', () => {
  it('puan 1-5 arası ve yorum en az 3 karakter olmalıdır', () => {
    expect(reviewSchema.safeParse({ rating: 6, comment: 'harika' }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: 5, comment: 'ok' }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: 4, comment: 'Hızlı teslimat' }).success).toBe(true);
  });
});
