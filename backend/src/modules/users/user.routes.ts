import { Router } from 'express';
import { audited } from '@/modules/audit/audit.middleware';
import { authenticate, requirePermission } from '@/middlewares/auth.middleware';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { userController } from './user.controller';
import {
  adminListUsersSchema,
  banUserSchema,
  changePasswordSchema,
  setRoleSchema,
  setSellerSchema,
  updateProfileSchema,
  userIdParamSchema,
} from './user.schema';

const router = Router();

router.use(authenticate);

// ─── Oturum sahibi ─────────────────────────────────────────────────────────────
router.get('/profile', asyncHandler(userController.getProfile));
router.put('/profile', validateRequest(updateProfileSchema), asyncHandler(userController.updateProfile));
router.put('/password', validateRequest(changePasswordSchema), asyncHandler(userController.changePassword));

// ─── Yönetim ───────────────────────────────────────────────────────────────────
router.get('/admin', requirePermission('manage_users'), validateRequest(adminListUsersSchema), asyncHandler(userController.listForAdmin));
router.patch('/admin/:id/role', requirePermission('manage_roles'), validateRequest(setRoleSchema), audited('user.role', 'USER', 'Kullanıcı rolü değiştirildi'), asyncHandler(userController.setRole));
router.patch('/admin/:id/seller', requirePermission('manage_users'), validateRequest(setSellerSchema), audited('user.seller', 'USER', 'Satıcı yetkisi değiştirildi'), asyncHandler(userController.setSellerPermission));
router.post('/admin/:id/ban', requirePermission('ban_user'), validateRequest(banUserSchema), audited('user.ban', 'USER', 'Kullanıcı yasaklandı'), asyncHandler(userController.ban));
router.post('/admin/:id/unban', requirePermission('ban_user'), validateRequest(userIdParamSchema), audited('user.unban', 'USER', 'Kullanıcının yasağı kaldırıldı'), asyncHandler(userController.unban));

export const userRoutes = router;
