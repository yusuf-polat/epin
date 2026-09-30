import { Router } from 'express';
import { audited } from '@/modules/audit/audit.middleware';
import { authenticate, requirePermission } from '@/middlewares/auth.middleware';
import { sensitiveLimiter } from '@/middlewares/rateLimit';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { complaintController } from './complaint.controller';
import { adminListComplaintsSchema, createComplaintSchema, resolveComplaintSchema } from './complaint.schema';

const router = Router();

router.use(authenticate);

router.post('/', sensitiveLimiter, validateRequest(createComplaintSchema), asyncHandler(complaintController.create));

router.get('/admin', requirePermission('moderate_content'), validateRequest(adminListComplaintsSchema), asyncHandler(complaintController.listForAdmin));
router.post(
  '/admin/:id/resolve',
  requirePermission('moderate_content'),
  validateRequest(resolveComplaintSchema),
  audited('complaint.resolve', 'COMPLAINT', 'Şikâyet sonuçlandırıldı'),
  asyncHandler(complaintController.resolve)
);

export const complaintRoutes = router;
