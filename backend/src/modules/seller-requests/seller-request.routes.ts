import { Router } from 'express';
import { audited } from '@/modules/audit/audit.middleware';
import { authenticate, requirePermission } from '@/middlewares/auth.middleware';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { sellerRequestController } from './seller-request.controller';
import { createSellerRequestSchema, listSellerRequestsSchema, resolveSellerRequestSchema } from './seller-request.schema';

const router = Router();

router.use(authenticate);

router.post('/', validateRequest(createSellerRequestSchema), asyncHandler(sellerRequestController.create));
router.get('/mine', asyncHandler(sellerRequestController.listMine));

router.get('/', requirePermission('manage_users'), validateRequest(listSellerRequestsSchema), asyncHandler(sellerRequestController.list));
router.post('/:id/resolve', requirePermission('manage_users'), validateRequest(resolveSellerRequestSchema), audited('seller_request.resolve', 'SELLER_REQUEST', 'Satıcı başvurusu sonuçlandırıldı'), asyncHandler(sellerRequestController.resolve));

export const sellerRequestRoutes = router;
