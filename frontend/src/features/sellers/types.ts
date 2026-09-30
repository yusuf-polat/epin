export type SellerRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SellerRequest {
  id: string;
  reason: string;
  status: SellerRequestStatus;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string; canSell: boolean; createdAt: string };
}
