export interface AuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  actor: { id: string; name: string; email: string; role: string } | null;
}

export interface AuditParams {
  page: number;
  action?: string;
  targetType?: string;
  search?: string;
}
