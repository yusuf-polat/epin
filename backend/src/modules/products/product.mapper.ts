import { DeliveryType, Prisma } from '@prisma/client';
import { toNullableNumber, toNumber } from '@/utils/money';

type VariantWithPinCount = {
  id: string;
  price: Prisma.Decimal;
  originalPrice: Prisma.Decimal | null;
  stockCount: number;
  _count?: { pins: number };
};

/**
 * Anında teslimatta stok = satılabilir (AVAILABLE) kod sayısı,
 * manuel teslimatta stok = satıcının beyan ettiği adet.
 */
export function mapVariant<V extends VariantWithPinCount>(variant: V, deliveryType: DeliveryType) {
  const { _count, ...rest } = variant;
  return {
    ...rest,
    price: toNumber(variant.price),
    originalPrice: toNullableNumber(variant.originalPrice),
    availableStock: deliveryType === 'MANUAL' ? variant.stockCount : _count?.pins ?? 0,
  };
}

export function ratingSummary(reviews: { rating: number }[]) {
  const reviewCount = reviews.length;
  const avgRating = reviewCount > 0 ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviewCount).toFixed(1)) : null;
  return { avgRating, reviewCount };
}

/** Ürün kartı / detay için ortak dönüşüm (Decimal → number, stok ve puan hesabı) */
export function mapProduct<
  P extends { deliveryType: DeliveryType; variants: VariantWithPinCount[]; reviews?: { rating: number }[] },
>(product: P) {
  const { reviews, variants, ...rest } = product;
  const mappedVariants = variants.map((v) => mapVariant(v, product.deliveryType));
  return {
    ...rest,
    ...ratingSummary(reviews ?? []),
    variants: mappedVariants,
    totalStock: mappedVariants.reduce((sum, v) => sum + v.availableStock, 0),
  };
}
