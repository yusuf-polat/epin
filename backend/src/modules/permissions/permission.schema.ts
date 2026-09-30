import { z } from 'zod';
import { PERMISSIONS } from './permission.constants';

export const setRolePermissionsSchema = z.object({
  body: z.object({
    role: z.enum(['USER', 'DESTEK', 'ADMIN']),
    permissions: z.array(z.enum(PERMISSIONS)),
  }),
});
