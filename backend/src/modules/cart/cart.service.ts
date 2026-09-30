import { BadRequestError, NotFoundError } from '@/utils/errors';
import { roundMoney, toNullableNumber, toNumber } from '@/utils/money';
import { cartRepository, CartItemRecord } from './cart.repository';
import { CartLineDTO } from './cart.types';
import { MAX_ITEM_QUANTITY } from './cart.constants';

type VariantRecord = CartItemRecord['variant'];

function availableStock(variant: VariantRecord) {
  return variant.product.deliveryType === 'MANUAL' ? variant.stockCount : variant._count.pins;
}

/** Ürün satın alınabilir mi? Değilse kullanıcıya gösterilecek nedeni döner */
function unavailableReason(variant: VariantRecord, userId: string): string | null {
  const { product } = variant;
  if (product.approvalStatus !== 'APPROVED' || !product.isActive || !product.isListed) return 'Ürün satışta değil';
  if (product.seller && (product.seller.isBanned || product.seller.store?.isActive === false)) return 'Satıcı şu anda satış yapmıyor';
  if (product.sellerId === userId) return 'Kendi ilanınızı satın alamazsınız';
  if (availableStock(variant) <= 0) return 'Stokta yok';
  return null;
}

function mapItem(item: CartItemRecord, userId: string) {
  const { variant } = item;
  const price = toNumber(variant.price);
  const stock = availableStock(variant);
  return {
    id: item.id,
    variantId: item.variantId,
    quantity: item.quantity,
    unitPrice: price,
    totalPrice: roundMoney(price * item.quantity),
    availableStock: stock,
    unavailableReason: unavailableReason(variant, userId) ?? (item.quantity > stock ? `Stokta yalnızca ${stock} adet var` : null),
    variant: {
      id: variant.id,
      title: variant.title,
      denomination: variant.denomination,
      price,
      originalPrice: toNullableNumber(variant.originalPrice),
    },
    product: {
      id: variant.product.id,
      title: variant.product.title,
      slug: variant.product.slug,
      imageUrl: variant.product.imageUrl,
      brand: variant.product.brand,
      region: variant.product.region,
      deliveryType: variant.product.deliveryType,
      store: variant.product.seller?.store ? { name: variant.product.seller.store.name, slug: variant.product.seller.store.slug } : null,
    },
  };
}

async function validateLine(userId: string, variantId: string, quantity: number) {
  const variant = await cartRepository.findVariant(variantId);
  if (!variant) throw new NotFoundError('Ürün paketi bulunamadı', 'VARIANT_NOT_FOUND');
  const reason = unavailableReason(variant, userId);
  if (reason) throw new BadRequestError(reason, 'NOT_PURCHASABLE');
  const stock = availableStock(variant);
  if (quantity > stock) throw new BadRequestError(`Stokta yalnızca ${stock} adet bulunuyor`, 'INSUFFICIENT_STOCK');
}

export const cartService = {
  async get(userId: string) {
    const items = (await cartRepository.findByUser(userId)).map((i) => mapItem(i, userId));
    const subtotal = roundMoney(items.reduce((sum, i) => sum + i.totalPrice, 0));
    return {
      items,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal,
      total: subtotal,
      hasUnavailableItems: items.some((i) => i.unavailableReason !== null),
    };
  },

  async addItem(userId: string, { variantId, quantity }: CartLineDTO) {
    const existing = await cartRepository.findItem(userId, variantId);
    const nextQuantity = Math.min((existing?.quantity ?? 0) + quantity, MAX_ITEM_QUANTITY);
    await validateLine(userId, variantId, nextQuantity);
    await cartRepository.upsertQuantity(userId, variantId, nextQuantity);
    return this.get(userId);
  },

  async updateItem(userId: string, itemId: string, quantity: number) {
    const item = await cartRepository.findItemById(userId, itemId);
    if (!item) throw new NotFoundError('Sepet ürünü bulunamadı', 'CART_ITEM_NOT_FOUND');
    if (quantity === 0) {
      await cartRepository.remove(userId, itemId);
    } else {
      await validateLine(userId, item.variantId, quantity);
      await cartRepository.updateQuantity(itemId, quantity);
    }
    return this.get(userId);
  },

  async removeItem(userId: string, itemId: string) {
    await cartRepository.remove(userId, itemId);
    return this.get(userId);
  },

  async clear(userId: string) {
    await cartRepository.clear(userId);
    return this.get(userId);
  },

  /** Giriş öncesi tarayıcıda tutulan misafir sepetini hesaba aktarır; geçersiz satırlar atlanır */
  async merge(userId: string, lines: CartLineDTO[]) {
    for (const line of lines) {
      try {
        await this.addItem(userId, line);
      } catch {
        // Satın alınamayan veya stok dışı ürünler sessizce atlanır
      }
    }
    return this.get(userId);
  },
};
