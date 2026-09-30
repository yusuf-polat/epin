import type { DeliveryType } from '@/features/products/types';

/** Sunucu sepet satırı (GET /cart) */
export interface ServerCartItem {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  availableStock: number;
  unavailableReason: string | null;
  variant: { id: string; title: string; denomination: string; price: number; originalPrice: number | null };
  product: {
    id: string;
    title: string;
    slug: string;
    imageUrl: string;
    brand: string;
    region: string;
    deliveryType: DeliveryType;
    store: { name: string; slug: string } | null;
  };
}

export interface ServerCart {
  items: ServerCartItem[];
  itemCount: number;
  subtotal: number;
  total: number;
  hasUnavailableItems: boolean;
}

/** UI'da kullanılan birleşik sepet satırı (misafir veya sunucu) */
export interface CartLine {
  variantId: string;
  /** Yalnızca sunucu sepetinde bulunur */
  itemId?: string;
  quantity: number;
  unitPrice: number;
  title: string;
  denomination: string;
  imageUrl?: string;
  slug?: string;
  deliveryType?: DeliveryType;
  storeName?: string | null;
  availableStock?: number;
  unavailableReason?: string | null;
}

export type CartLineSnapshot = Omit<CartLine, 'itemId' | 'availableStock' | 'unavailableReason'>;
