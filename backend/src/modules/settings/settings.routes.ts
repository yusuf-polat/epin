import { Router } from 'express';
import { audited } from '@/modules/audit/audit.middleware';
import { authenticate, requirePermission } from '@/middlewares/auth.middleware';
import { sensitiveLimiter } from '@/middlewares/rateLimit';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { settingsController } from './settings.controller';
import { testSmtpSchema, updateCommissionSchema, updateSmtpSchema } from './settings.schema';

const router = Router();

router.get('/public', asyncHandler(settingsController.publicSettings));

router.use(authenticate, requirePermission('manage_settings'));
router.put('/commission', validateRequest(updateCommissionSchema), audited('settings.commission', 'SETTINGS', 'Komisyon ayarları güncellendi'), asyncHandler(settingsController.updateCommission));
router.get('/smtp', asyncHandler(settingsController.getSmtp));
router.put('/smtp', validateRequest(updateSmtpSchema), audited('settings.smtp', 'SETTINGS', 'E-posta (SMTP) ayarları güncellendi'), asyncHandler(settingsController.updateSmtp));
router.post('/smtp/test', sensitiveLimiter, validateRequest(testSmtpSchema), asyncHandler(settingsController.testSmtp));

export const settingsRoutes = router;
