import { ComplaintStatus, ComplaintTarget } from '@prisma/client';
import { ComplaintReason } from './complaint.constants';

export interface CreateComplaintDTO {
  targetType: ComplaintTarget;
  targetId: string;
  reason: ComplaintReason;
  details?: string;
}

export interface ResolveComplaintDTO {
  status: Exclude<ComplaintStatus, 'OPEN'>;
  note: string;
  /** Şikâyet haklıysa içeriği kaldır: ilan yayından kalkar, yorum silinir, mağaza askıya alınır */
  takeDown?: boolean;
}

export interface AdminComplaintListQuery {
  page: number;
  limit: number;
  status?: ComplaintStatus;
  targetType?: ComplaintTarget;
}

/** Şikâyet edilen içeriğin özeti (yönetim ekranı ve bildirimler için) */
export interface ComplaintTargetInfo {
  title: string;
  link: string;
  ownerId: string | null;
}
