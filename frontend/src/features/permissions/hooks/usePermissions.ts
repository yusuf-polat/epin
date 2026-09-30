'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@/features/auth/types';
import { permissionApi } from '../services/permission.api';
import { permissionKeys } from '../constants';

/** Rol → izin listesi eşlemesi */
export const useRolePermissions = () =>
  useQuery({
    queryKey: permissionKeys.all,
    queryFn: permissionApi.list,
    select: ({ assignments }) => {
      const map: Record<Role, string[]> = { USER: [], DESTEK: [], ADMIN: [] };
      for (const a of assignments) map[a.role]?.push(a.permission);
      return map;
    },
  });

export function useSetRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { role: Role; permissions: string[] }) => permissionApi.setForRole(v.role, v.permissions),
    onSettled: () => qc.invalidateQueries({ queryKey: permissionKeys.all }),
  });
}
