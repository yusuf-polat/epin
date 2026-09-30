import { Router } from 'express';
import { audited } from '@/modules/audit/audit.middleware';
import { authenticate, requirePermission } from '@/middlewares/auth.middleware';
import { sensitiveLimiter } from '@/middlewares/rateLimit';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { depositController } from './deposit.controller';
import {
  adminListDepositsSchema,
  approveDepositSchema,
  createCryptoDepositSchema,
  createDepositSchema,
  depositIdSchema,
  listMyDepositsSchema,
  rejectDepositSchema,
} from './deposit.schema';

const router = Router();

router.use(authenticate);

router.get('/bank-info', asyncHandler(depositController.bankInfo));
router.post('/', sensitiveLimiter, validateRequest(createDepositSchema), asyncHandler(depositController.create));
router.post('/crypto', sensitiveLimiter, validateRequest(createCryptoDepositSchema), asyncHandler(depositController.createCrypto));
router.get('/mine', validateRequest(listMyDepositsSchema), asyncHandler(depositController.listMine));
router.post('/:id/cancel', validateRequest(depositIdSchema), asyncHandler(depositController.cancel));

// Yönetim
router.get('/', requirePermission('manage_finance'), validateRequest(adminListDepositsSchema), asyncHandler(depositController.listForAdmin));
router.post('/:id/approve', requirePermission('manage_finance'), sensitiveLimiter, validateRequest(approveDepositSchema), audited('deposit.approve', 'DEPOSIT', 'Bakiye yükleme talebi onaylandı'), asyncHandler(depositController.approve));
router.post('/:id/reject', requirePermission('manage_finance'), sensitiveLimiter, validateRequest(rejectDepositSchema), audited('deposit.reject', 'DEPOSIT', 'Bakiye yükleme talebi reddedildi'), asyncHandler(depositController.reject));

export const depositRoutes = router;
