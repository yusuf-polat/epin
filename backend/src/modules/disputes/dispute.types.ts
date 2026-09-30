import { DisputeReason, Role } from '@prisma/client';

export interface CreateDisputeDTO {
  orderId: string;
  reason: DisputeReason;
  description: string;
  videoUrl: string;
}

export type SellerAction = 'REFUND' | 'REPLACE' | 'REJECT';

export interface SellerRespondDTO {
  action: SellerAction;
  response: string;
  replacementCode?: string;
}

export type ResolveDecision = 'BUYER' | 'SELLER';

export interface DisputeViewer {
  id: string;
  role: Role;
}
