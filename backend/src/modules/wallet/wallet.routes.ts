import { Router } from 'express';
import { audited } from '@/modules/audit/audit.middleware';
import { authenticate, requirePermission } from '@/middlewares/auth.middleware';
import { sensitiveLimiter } from '@/middlewares/rateLimit';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { walletController } from './wallet.controller';
import { adminAdjustSchema, adminLedgerSchema, listTransactionsSchema, topupSchema } from './wallet.schema';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(walletController.summary));
router.get('/transactions', validateRequest(listTransactionsSchema), asyncHandler(walletController.transactions));
router.post('/topup', sensitiveLimiter, validateRequest(topupSchema), asyncHandler(walletController.topup));

router.get('/admin/transactions', requirePermission('manage_finance'), validateRequest(adminLedgerSchema), asyncHandler(walletController.adminLedger));

router.post(
  '/admin/:userId/adjust',
  requirePermission('manage_wallets'),
  sensitiveLimiter,
  validateRequest(adminAdjustSchema),
  audited('wallet.adjust', 'USER', 'Kullanıcı bakiyesi düzenlendi', { param: 'userId' }),
  asyncHandler(walletController.adminAdjust)
);

export const walletRoutes = router;
