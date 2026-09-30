import { Role } from '@prisma/client';
import { prisma } from '@/config/prisma';

export const permissionRepository = {
  findAll() {
    return prisma.rolePermission.findMany({ orderBy: [{ role: 'asc' }, { permission: 'asc' }] });
  },

  findByRole(role: Role) {
    return prisma.rolePermission.findMany({ where: { role } });
  },

  exists(role: Role, permission: string) {
    return prisma.rolePermission.findUnique({ where: { role_permission: { role, permission } } });
  },

  async replaceForRole(role: Role, permissions: string[]) {
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { role } }),
      prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({ role, permission })),
        skipDuplicates: true,
      }),
    ]);
    return prisma.rolePermission.findMany({ where: { role } });
  },
};
