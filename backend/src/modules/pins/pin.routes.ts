import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middlewares/auth.middleware';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { paginationQuery } from '@/utils/pagination';
import { pinController } from './pin.controller';

const router = Router();

router.use(authenticate);

router.get('/', validateRequest(z.object({ query: z.object(paginationQuery(12)) })), asyncHandler(pinController.listMine));
router.get(
  '/:id/reveal',
  validateRequest(z.object({ params: z.object({ id: z.string().uuid() }) })),
  asyncHandler(pinController.reveal)
);

export const pinRoutes = router;
