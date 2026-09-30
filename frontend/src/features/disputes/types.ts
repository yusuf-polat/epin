export type DisputeStatus = 'WAITING_SELLER' | 'SELLER_APPROVED' | 'WAITING_SUPPORT' | 'RESOLVED_BUYER' | 'RESOLVED_SELLER' | 'CANCELLED';
export type DisputeReason = 'INVALID_CODE' | 'ALREADY_USED' | 'WRONG_PRODUCT' | 'OTHER';

interface Party {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface Dispute {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string | null;
  reason: DisputeReason;
  description: string;
  videoUrl: string;
  status: DisputeStatus;
  sellerResponse: string | null;
  sellerAction: 'REFUND' | 'REPLACE' | 'REJECT' | null;
  sellerActionAt: string | null;
  replacementCode?: string | null;
  hasReplacementCode: boolean;
  adminNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    escrowAmount: number;
    escrowStatus: string;
    createdAt: string;
    items: { quantity: number; totalPrice: number; variant: { title: string; product: { title: string; imageUrl: string; slug: string } } }[];
  };
  buyer: Party;
  seller: Party | null;
}
