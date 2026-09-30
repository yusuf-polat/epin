export type ResolveAction = 'APPROVED' | 'REJECTED';

export interface ResolveSellerRequestDTO {
  action: ResolveAction;
  adminNotes?: string;
}
