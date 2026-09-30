'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/features/auth/constants';
import type { Role } from '@/features/auth/types';
import { userApi } from '../services/user.api';
import { ADMIN_USERS_PAGE_SIZE, userKeys } from '../constants';

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: (user) => qc.setQueryData(authKeys.me, user),
  });
}

export const useChangePassword = () => useMutation({ mutationFn: (v: { oldPassword: string; newPassword: string }) => userApi.changePassword(v.oldPassword, v.newPassword) });

export const useAdminUsers = (params: { page: number; search?: string }) =>
  useQuery({ queryKey: userKeys.admin(params), queryFn: () => userApi.adminList({ ...params, limit: ADMIN_USERS_PAGE_SIZE }), placeholderData: keepPreviousData });

function useAdminUserMutation<TVars>(fn: (v: TVars) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: userKeys.all }) });
}

export const useSetUserRole = () => useAdminUserMutation((v: { id: string; role: Role }) => userApi.setRole(v.id, v.role));
export const useSetSellerPermission = () => useAdminUserMutation((v: { id: string; canSell: boolean }) => userApi.setSeller(v.id, v.canSell));
export const useBanUser = () => useAdminUserMutation((v: { id: string; reason: string }) => userApi.ban(v.id, v.reason));
export const useUnbanUser = () => useAdminUserMutation((id: string) => userApi.unban(id));
