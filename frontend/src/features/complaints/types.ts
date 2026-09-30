export type ComplaintTarget = 'PRODUCT' | 'STORE' | 'REVIEW';
export type ComplaintStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';

export interface CreateComplaintInput {
  targetType: ComplaintTarget;
  targetId: string;
  reason: string;
  details?: string;
}

export interface AdminComplaint {
  id: string;
  targetType: ComplaintTarget;
  targetId: string;
  reason: string;
  reasonLabel: string;
  details: string | null;
  status: ComplaintStatus;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reporter: { id: string; name: string; email: string };
  resolvedBy: { id: string; name: string } | null;
  /** İçerik silinmişse null */
  target: { title: string; link: string; ownerId: string | null } | null;
  openCountForTarget: number;
}
