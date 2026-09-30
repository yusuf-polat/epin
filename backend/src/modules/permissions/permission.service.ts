import { Role } from '@prisma/client';
import { getCachedData, invalidateCache, setCachedData } from '@/config/redis';
import { BadRequestError } from '@/utils/errors';
import { permissionRepository } from './permission.repository';
import { Permission } from './permission.constants';

export type { Permission } from './permission.constants';

const cacheKey = (role: Role) => `cache:permissions:${role}`;

export async function hasPermission(role: Role, permission: Permission): Promise<boolean> {
  if (role === 'ADMIN') return true;
  const cached = await getCachedData<string[]>(cacheKey(role));
  const permissions = cached ?? (await permissionRepository.findByRole(role)).map((p) => p.permission);
  if (!cached) await setCachedData(cacheKey(role), permissions, 60);
  return permissions.includes(permission);
}

export const permissionService = {
  list() {
    return permissionRepository.findAll();
  },

  async setForRole(role: Role, permissions: Permission[]) {
    if (role === 'ADMIN') {
      // ADMIN her zaman tam yetkilidir; kilitlenmeyi önlemek için değiştirilemez
      throw new BadRequestError('ADMIN rolünün izinleri değiştirilemez', 'ADMIN_PERMISSIONS_LOCKED');
    }
    const result = await permissionRepository.replaceForRole(role, [...new Set(permissions)]);
    await invalidateCache(cacheKey(role));
    return result;
  },
};
