import { apiClient } from '@/lib/api';
import type { Role } from '@/features/auth/types';
import type { RolePermission } from '../types';

export const permissionApi = {
  list: () => apiClient.get<{ available: string[]; assignments: RolePermission[] }>('/permissions'),
  setForRole: (role: Role, permissions: string[]) => apiClient.put<RolePermission[]>('/permissions', { role, permissions }),
};
