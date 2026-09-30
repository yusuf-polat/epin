import { Router } from 'express';
import { authenticate, requirePermission } from '@/middlewares/auth.middleware';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { auditController } from './audit.controller';
import { listAuditSchema } from './audit.schema';

const router = Router();

router.get('/', authenticate, requirePermission('view_audit_log'), validateRequest(listAuditSchema), asyncHandler(auditController.list));

export const auditRoutes = router;
