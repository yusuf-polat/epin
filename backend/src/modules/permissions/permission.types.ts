import { Role } from '@prisma/client';
import { Permission } from './permission.constants';

export interface SetRolePermissionsDTO {
  role: Role;
  permissions: Permission[];
}
