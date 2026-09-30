import { DeliveryStatus, EscrowStatus } from '@prisma/client';

export interface CheckoutLine {
  variantId: string;
  quantity: number;
}

export interface CheckoutDTO {
  paymentMethod: 'WALLET';
  acceptTerms: true;
  items?: CheckoutLine[];
}

export interface DeliverOrderDTO {
  deliveryNotes: string;
  codes?: string[];
}

export type SellerOrderFilter = 'pending' | 'all';

export interface AdminOrderListQuery {
  page: number;
  limit: number;
  search?: string;
  escrowStatus?: EscrowStatus;
  deliveryStatus?: DeliveryStatus;
}

/** Escrow'un serbest bırakılma / iade nedenleri (bildirim ve ledger açıklamaları için) */
export type ReleaseReason = 'BUYER_CONFIRMED' | 'AUTO_RELEASE' | 'DISPUTE_RESOLVED' | 'DISPUTE_REPLACED';
export type RefundReason = 'SELLER_REFUND' | 'DISPUTE_RESOLVED' | 'DELIVERY_OVERDUE' | 'SELLER_CANCELLED';
