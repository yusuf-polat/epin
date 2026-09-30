export interface AuditEntry {
  actorId: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

export interface AuditListQuery {
  page: number;
  limit: number;
  action?: string;
  targetType?: string;
  actorId?: string;
  search?: string;
}
