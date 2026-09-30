import { apiClient } from '@/lib/api';
import type { AuthUser, Role } from '@/features/auth/types';
import type { AdminUserRow, UpdateProfileInput } from '../types';

export const userApi = {
  updateProfile: (input: UpdateProfileInput) =>
    apiClient.put<AuthUser>('/users/profile', input),
  changePassword: (oldPassword: string, newPassword: string) => apiClient.put<null>('/users/password', { oldPassword, newPassword }),

  adminList: (params: { page?: number; limit?: number; search?: string }) => apiClient.getPage<AdminUserRow>('/users/admin', { params }),
  setRole: (id: string, role: Role) => apiClient.patch(`/users/admin/${id}/role`, { role }),
  setSeller: (id: string, canSell: boolean) => apiClient.patch(`/users/admin/${id}/seller`, { canSell }),
  ban: (id: string, reason: string) => apiClient.post(`/users/admin/${id}/ban`, { reason }),
  unban: (id: string) => apiClient.post(`/users/admin/${id}/unban`),
};
