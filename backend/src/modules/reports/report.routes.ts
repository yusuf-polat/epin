import { Router } from 'express';
import { authenticate, requireStaff } from '@/middlewares/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { reportController } from './report.controller';

const router = Router();

router.get('/dashboard', authenticate, requireStaff, asyncHandler(reportController.dashboard));

export const reportRoutes = router;
