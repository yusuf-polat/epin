import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { roundMoney, toNullableNumber, toNumber } from '@/utils/money';
import { buildMeta, toSkip } from '@/utils/pagination';
import { slugify } from '@/utils/slugify';
import { maskCode } from '@/modules/pins/pin.mapper';
import { mapProduct, ratingSummary } from '@/modules/products/product.mapper';

describe('money', () => {
  it('Decimal değerleri number yapar', () => {
    expect(toNumber(new Prisma.Decimal('12.34'))).toBe(12.34);
    expect(toNumber(null)).toBe(0);
    expect(toNullableNumber(undefined)).toBeNull();
  });
  it('kuruş hassasiyetinde yuvarlar', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(10.005 * 3)).toBe(30.02);
  });
});

describe('pagination', () => {
  it('skip ve meta hesaplar', () => {
    expect(toSkip({ page: 3, limit: 20 })).toBe(40);
    expect(buildMeta({ page: 1, limit: 20 }, 0)).toEqual({ page: 1, limit: 20, total: 0, totalPages: 1 });
    expect(buildMeta({ page: 2, limit: 20 }, 41).totalPages).toBe(3);
  });
});

describe('slugify', () => {
  it('Türkçe karakterleri dönüştürür', () => {
    expect(slugify('Çılgın Şövalye Ürün İÖĞ!')).toBe('cilgin-sovalye-urun-iog');
  });
});

describe('maskCode', () => {
  it('kodun ortasını gizler, tamamını asla göstermez', () => {
    const masked = maskCode('ABCD-EFGH-IJKL-MNOP');
    expect(masked.startsWith('ABCD')).toBe(true);
    expect(masked.endsWith('MNOP')).toBe(true);
    expect(masked).not.toContain('EFGH');
  });
  it('kısa kodları tamamen gizler', () => {
    expect(maskCode('ABC')).toBe('•••');
  });
});

describe('product mapper', () => {
  const variant = (id: string, pins: number, stockCount: number) => ({
    id,
    price: new Prisma.Decimal(10),
    originalPrice: null,
    stockCount,
    _count: { pins },
  });

  it('anında teslimatta stok = satılabilir kod sayısı', () => {
    const p = mapProduct({ deliveryType: 'INSTANT', variants: [variant('a', 3, 99)], reviews: [] });
    expect(p.totalStock).toBe(3);
  });

  it('manuel teslimatta stok = beyan edilen adet', () => {
    const p = mapProduct({ deliveryType: 'MANUAL', variants: [variant('a', 0, 5)], reviews: [] });
    expect(p.totalStock).toBe(5);
  });

  it('yorum yoksa sahte puan üretmez', () => {
    expect(ratingSummary([])).toEqual({ avgRating: null, reviewCount: 0 });
    expect(ratingSummary([{ rating: 4 }, { rating: 5 }])).toEqual({ avgRating: 4.5, reviewCount: 2 });
  });
});
