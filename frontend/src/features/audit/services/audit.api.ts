import { apiClient } from '@/lib/api';
import { AuditLog, AuditParams } from '../types';

export const auditApi = {
  list: (params: AuditParams) => apiClient.getPage<AuditLog>('/audit-logs', { params: { ...params } }),
};
