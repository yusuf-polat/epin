import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { assertPurchasable, calculateCommission, CheckoutVariant, deliveryDeadline, groupLines, mergeLines } from '@/modules/orders/order.rules';
import { AppError } from '@/utils/errors';

function variant(overrides: {
  id: string;
  price: number;
  sellerId?: string | null;
  deliveryType?: 'INSTANT' | 'MANUAL';
  deadline?: number;
  approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
  isActive?: boolean;
  isListed?: boolean;
  sellerBanned?: boolean;
  storeActive?: boolean;
  commissionRate?: number | null;
}): CheckoutVariant {
  const sellerId = overrides.sellerId === undefined ? 'seller-1' : overrides.sellerId;
  return {
    id: overrides.id,
    productId: `p-${overrides.id}`,
    title: 'Paket',
    denomination: '100 VP',
    price: new Prisma.Decimal(overrides.price),
    originalPrice: null,
    stockCount: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    product: {
      id: `p-${overrides.id}`,
      title: `Ürün ${overrides.id}`,
      slug: `urun-${overrides.id}`,
      sellerId,
      deliveryType: overrides.deliveryType ?? 'INSTANT',
      deliveryDeadlineHours: overrides.deadline ?? 24,
      approvalStatus: overrides.approvalStatus ?? 'APPROVED',
      isActive: overrides.isActive ?? true,
      isListed: overrides.isListed ?? true,
      category: { commissionRate: overrides.commissionRate == null ? null : new Prisma.Decimal(overrides.commissionRate) },
      seller: sellerId ? { isBanned: overrides.sellerBanned ?? false, store: { isActive: overrides.storeActive ?? true } } : null,
    },
  } as CheckoutVariant;
}

const expectCode = (fn: () => void, code: string) => {
  try {
    fn();
    throw new Error('hata bekleniyordu');
  } catch (err) {
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe(code);
  }
};

describe('mergeLines', () => {
  it('aynı varyantın satırlarını adetleri toplayarak birleştirir', () => {
    expect(
      mergeLines([
        { variantId: 'a', quantity: 1 },
        { variantId: 'b', quantity: 2 },
        { variantId: 'a', quantity: 3 },
      ])
    ).toEqual([
      { variantId: 'a', quantity: 4 },
      { variantId: 'b', quantity: 2 },
    ]);
  });
});

describe('assertPurchasable', () => {
  it('olmayan varyantı reddeder', () => expectCode(() => assertPurchasable(undefined, 'buyer'), 'VARIANT_NOT_FOUND'));
  it('onaysız ürünü reddeder', () => expectCode(() => assertPurchasable(variant({ id: 'a', price: 10, approvalStatus: 'PENDING' }), 'buyer'), 'NOT_PURCHASABLE'));
  it('kapatılmış ilanı reddeder', () => expectCode(() => assertPurchasable(variant({ id: 'a', price: 10, isActive: false }), 'buyer'), 'NOT_PURCHASABLE'));
  it('yayından kaldırılmış ilanı reddeder', () => expectCode(() => assertPurchasable(variant({ id: 'a', price: 10, isListed: false }), 'buyer'), 'NOT_PURCHASABLE'));
  it('askıdaki satıcıyı reddeder', () => expectCode(() => assertPurchasable(variant({ id: 'a', price: 10, sellerBanned: true }), 'buyer'), 'SELLER_UNAVAILABLE'));
  it('askıdaki mağazayı reddeder', () => expectCode(() => assertPurchasable(variant({ id: 'a', price: 10, storeActive: false }), 'buyer'), 'SELLER_UNAVAILABLE'));
  it('satıcının kendi ilanını almasını engeller', () => expectCode(() => assertPurchasable(variant({ id: 'a', price: 10 }), 'seller-1'), 'OWN_LISTING'));
  it('platform ürününü kabul eder', () => expect(() => assertPurchasable(variant({ id: 'a', price: 10, sellerId: null }), 'buyer')).not.toThrow());
});

describe('groupLines', () => {
  it('sepeti satıcı ve teslimat tipine göre ayrı siparişlere böler', () => {
    const variants = new Map(
      [
        variant({ id: 'a', price: 10.1, sellerId: 's1' }),
        variant({ id: 'b', price: 20.2, sellerId: 's1' }),
        variant({ id: 'c', price: 5, sellerId: 's1', deliveryType: 'MANUAL' }),
        variant({ id: 'd', price: 7, sellerId: 's2' }),
        variant({ id: 'e', price: 3, sellerId: null }),
      ].map((v) => [v.id, v])
    );
    const groups = groupLines(
      [
        { variantId: 'a', quantity: 3 },
        { variantId: 'b', quantity: 1 },
        { variantId: 'c', quantity: 2 },
        { variantId: 'd', quantity: 1 },
        { variantId: 'e', quantity: 1 },
      ],
      variants
    );

    expect(groups).toHaveLength(4);
    const s1Instant = groups.find((g) => g.sellerId === 's1' && g.deliveryType === 'INSTANT')!;
    // 10.1*3 + 20.2 = 50.5 (kuruş hassasiyetinde, float hatası olmadan)
    expect(s1Instant.total).toBe(50.5);
    expect(s1Instant.lines).toHaveLength(2);
    expect(groups.find((g) => g.sellerId === 's1' && g.deliveryType === 'MANUAL')!.total).toBe(10);
    expect(groups.find((g) => g.sellerId === null)!.total).toBe(3);
  });
});

describe('deliveryDeadline', () => {
  it('gruptaki en uzun teslim süresini baz alır', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const [group] = groupLines(
      [
        { variantId: 'a', quantity: 1 },
        { variantId: 'b', quantity: 1 },
      ],
      new Map([
        ['a', variant({ id: 'a', price: 1, deliveryType: 'MANUAL', deadline: 2 })],
        ['b', variant({ id: 'b', price: 1, deliveryType: 'MANUAL', deadline: 12 })],
      ])
    );
    expect(deliveryDeadline(group, now).toISOString()).toBe('2026-01-01T12:00:00.000Z');
  });
});

describe('komisyon', () => {
  it('yüzdeyi kuruşa yuvarlar ve tutarı aşmaz', () => {
    expect(calculateCommission(33.33, 8)).toBe(2.67);
    expect(calculateCommission(100, 0)).toBe(0);
    expect(calculateCommission(0, 10)).toBe(0);
    expect(calculateCommission(10, 150)).toBe(10);
  });

  it('kategori oranı varsayılanı ezer, platform ürününden komisyon alınmaz', () => {
    const variants = new Map(
      [
        variant({ id: 'a', price: 100, sellerId: 's1', commissionRate: 12.5 }),
        variant({ id: 'b', price: 50, sellerId: 's1' }),
        variant({ id: 'c', price: 80, sellerId: null }),
      ].map((v) => [v.id, v])
    );
    const groups = groupLines(
      [
        { variantId: 'a', quantity: 2 },
        { variantId: 'b', quantity: 1 },
        { variantId: 'c', quantity: 1 },
      ],
      variants,
      8
    );
    const seller = groups.find((g) => g.sellerId === 's1')!;
    // 200 * %12.5 + 50 * %8
    expect(seller.commission).toBe(29);
    expect(groups.find((g) => g.sellerId === null)!.commission).toBe(0);
  });
});
