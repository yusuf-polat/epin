import crypto from 'crypto';
import { DeliveryType } from '@prisma/client';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { roundMoney, toNumber } from '@/utils/money';
import type { orderRepository } from './order.repository';
import { ORDER_NUMBER_PREFIX } from './order.constants';
import { CheckoutLine } from './order.types';

/**
 * Checkout'un veritabanından bağımsız (saf) iş kuralları.
 * IO içermedikleri için unit testlerle doğrudan doğrulanır.
 */

export type CheckoutVariant = Awaited<ReturnType<typeof orderRepository.findVariantsForCheckout>>[number];

export interface OrderGroup {
  sellerId: string | null;
  deliveryType: DeliveryType;
  lines: { variant: CheckoutVariant; quantity: number; lineTotal: number; commission: number }[];
  total: number;
  /** Platform komisyonu (yalnızca P2P satıcı siparişlerinde) */
  commission: number;
}

/** Tutarın yüzdesi kadar komisyon (kuruşa yuvarlanır, tutarı aşamaz) */
export function calculateCommission(amount: number, percent: number): number {
  if (amount <= 0 || percent <= 0) return 0;
  return Math.min(amount, roundMoney((amount * percent) / 100));
}

/** Kategoride tanımlı oran yoksa platform varsayılanı kullanılır */
export function commissionPercentFor(variant: CheckoutVariant, defaultPercent: number): number {
  const rate = variant.product.category?.commissionRate;
  return rate === null || rate === undefined ? defaultPercent : toNumber(rate);
}

export const generateOrderNumber = () =>
  `${ORDER_NUMBER_PREFIX}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

/** Aynı varyantın tekrar eden satırlarını birleştirir */
export function mergeLines(lines: CheckoutLine[]): CheckoutLine[] {
  const merged = new Map<string, number>();
  for (const line of lines) merged.set(line.variantId, (merged.get(line.variantId) ?? 0) + line.quantity);
  return [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));
}

/** Ürün satın alınabilir değilse nedenini belirten hata fırlatır */
export function assertPurchasable(variant: CheckoutVariant | undefined, buyerId: string): asserts variant is CheckoutVariant {
  if (!variant) throw new NotFoundError('Sepetteki ürünlerden biri artık mevcut değil', 'VARIANT_NOT_FOUND');
  const { product } = variant;
  if (product.approvalStatus !== 'APPROVED' || !product.isActive || !product.isListed) {
    throw new BadRequestError(`"${product.title}" şu anda satışta değil`, 'NOT_PURCHASABLE');
  }
  if (product.seller && (product.seller.isBanned || product.seller.store?.isActive === false)) {
    throw new BadRequestError(`"${product.title}" satıcısı şu anda satış yapmıyor`, 'SELLER_UNAVAILABLE');
  }
  if (product.sellerId === buyerId) {
    throw new BadRequestError(`"${product.title}" sizin ilanınız; kendi ilanınızı satın alamazsınız`, 'OWN_LISTING');
  }
}

/**
 * P2P escrow'un doğru çalışması için sepet satıcı ve teslimat tipine göre
 * ayrı siparişlere bölünür: her siparişin tek satıcısı ve tek escrow'u olur.
 */
export function groupLines(lines: CheckoutLine[], variants: Map<string, CheckoutVariant>, defaultCommissionPercent = 0): OrderGroup[] {
  const groups = new Map<string, OrderGroup>();
  for (const line of lines) {
    const variant = variants.get(line.variantId)!;
    const sellerId = variant.product.sellerId;
    const deliveryType: DeliveryType = variant.product.deliveryType === 'MANUAL' ? 'MANUAL' : 'INSTANT';
    const key = `${sellerId ?? 'platform'}:${deliveryType}`;
    const lineTotal = roundMoney(toNumber(variant.price) * line.quantity);
    // Platform ürünlerinde tutarın tamamı zaten platformundur
    const commission = sellerId ? calculateCommission(lineTotal, commissionPercentFor(variant, defaultCommissionPercent)) : 0;
    const group = groups.get(key) ?? { sellerId, deliveryType, lines: [], total: 0, commission: 0 };
    group.lines.push({ variant, quantity: line.quantity, lineTotal, commission });
    group.total = roundMoney(group.total + lineTotal);
    group.commission = roundMoney(group.commission + commission);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** Manuel siparişte teslim son tarihi: gruptaki en uzun teslim süresi baz alınır */
export function deliveryDeadline(group: OrderGroup, now: Date): Date {
  const hours = Math.max(...group.lines.map((l) => l.variant.product.deliveryDeadlineHours));
  return new Date(now.getTime() + hours * 3_600_000);
}
