import type { DeliveryType } from '@/features/products/types';

export type EscrowStatus = 'HELD_IN_ESCROW' | 'RELEASED_TO_SELLER' | 'DISPUTED' | 'REFUNDED_TO_BUYER' | 'REPLACED';
export type DeliveryStatus = 'PENDING' | 'DELIVERED' | 'FAILED';
export type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variant: {
    id: string;
    title: string;
    denomination: string;
    product: { id: string; title: string; slug: string; imageUrl: string; brand: string; deliveryType: DeliveryType; deliveryInstructions?: string | null };
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  sellerId: string | null;
  totalAmount: number;
  escrowAmount: number;
  /** Platform komisyonu ve satıcıya geçecek net tutar */
  commissionAmount: number;
  sellerAmount: number;
  paymentMethod: string;
  status: OrderStatus;
  deliveryType: DeliveryType;
  deliveryStatus: DeliveryStatus;
  deliveredAt: string | null;
  deliveryDeadlineAt: string | null;
  deliveryNotes: string | null;
  escrowStatus: EscrowStatus;
  autoReleaseAt: string | null;
  createdAt: string;
  items: OrderItem[];
  pins: { id: string; maskedCode: string; serialNumber: string | null; variantId: string; soldAt: string | null }[];
  dispute: { id: string; status: string; reason: string; sellerAction: string | null; createdAt: string } | null;
  seller: { id: string; name: string; avatarUrl?: string | null; store?: { name: string; slug: string } | null } | null;
  buyer: { id: string; name: string; avatarUrl?: string | null };
}

export interface AdminOrderParams {
  page: number;
  search?: string;
  escrowStatus?: EscrowStatus;
  deliveryStatus?: DeliveryStatus;
}

export interface CheckoutResult {
  totalAmount: number;
  walletBalance: number;
  orders: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    deliveryType: DeliveryType;
    deliveryStatus: DeliveryStatus;
    deliveryDeadlineAt: string | null;
    escrowStatus: EscrowStatus;
    pins: { id: string; code: string; serialNumber: string | null; productTitle: string }[];
  }[];
}
