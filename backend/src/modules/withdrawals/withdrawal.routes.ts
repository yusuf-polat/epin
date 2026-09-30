import { Router } from 'express';
import { audited } from '@/modules/audit/audit.middleware';
import { authenticate, requirePermission, requireSeller } from '@/middlewares/auth.middleware';
import { sensitiveLimiter } from '@/middlewares/rateLimit';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { withdrawalController } from './withdrawal.controller';
import {
  adminListWithdrawalsSchema,
  createWithdrawalSchema,
  listMyWithdrawalsSchema,
  markPaidSchema,
  rejectWithdrawalSchema,
  withdrawalIdSchema,
} from './withdrawal.schema';

const router = Router();

router.use(authenticate);

// Satıcı: yalnızca satış kazancı olan onaylı satıcılar para çekebilir
router.post('/', requireSeller, sensitiveLimiter, validateRequest(createWithdrawalSchema), asyncHandler(withdrawalController.create));
router.get('/mine', validateRequest(listMyWithdrawalsSchema), asyncHandler(withdrawalController.listMine));
router.post('/:id/cancel', sensitiveLimiter, validateRequest(withdrawalIdSchema), asyncHandler(withdrawalController.cancel));

// Yönetim
router.get('/', requirePermission('manage_finance'), validateRequest(adminListWithdrawalsSchema), asyncHandler(withdrawalController.listForAdmin));
router.post('/:id/paid', requirePermission('manage_finance'), sensitiveLimiter, validateRequest(markPaidSchema), audited('withdrawal.paid', 'WITHDRAWAL', 'Para çekme talebi ödendi olarak işaretlendi'), asyncHandler(withdrawalController.markPaid));
router.post('/:id/reject', requirePermission('manage_finance'), sensitiveLimiter, validateRequest(rejectWithdrawalSchema), audited('withdrawal.reject', 'WITHDRAWAL', 'Para çekme talebi reddedildi'), asyncHandler(withdrawalController.reject));

export const withdrawalRoutes = router;
