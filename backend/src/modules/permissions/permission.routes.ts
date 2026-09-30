import { Router } from 'express';
import { audited } from '@/modules/audit/audit.middleware';
import { authenticate, requirePermission } from '@/middlewares/auth.middleware';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { permissionController } from './permission.controller';
import { setRolePermissionsSchema } from './permission.schema';

const router = Router();

router.use(authenticate, requirePermission('manage_roles'));

router.get('/', asyncHandler(permissionController.list));
router.put('/', validateRequest(setRolePermissionsSchema), audited('permission.update', 'ROLE', 'Rol izinleri güncellendi'), asyncHandler(permissionController.setForRole));

export const permissionRoutes = router;
