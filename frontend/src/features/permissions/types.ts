import type { Role } from '@/features/auth/types';

export interface RolePermission {
  id: string;
  role: Role;
  permission: string;
}
