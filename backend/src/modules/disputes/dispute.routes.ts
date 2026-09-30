import { Router } from 'express';
import { audited } from '@/modules/audit/audit.middleware';
import { authenticate, requirePermission } from '@/middlewares/auth.middleware';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { disputeController } from './dispute.controller';
import {
  createDisputeSchema,
  disputeIdSchema,
  escalateDisputeSchema,
  listDisputesSchema,
  resolveDisputeSchema,
  sellerRespondSchema,
} from './dispute.schema';

const router = Router();

router.use(authenticate);

// Listeler (/:id'den önce)
router.get('/mine', asyncHandler(disputeController.listMine));
router.get('/seller', asyncHandler(disputeController.listForSeller));
router.get('/', requirePermission('manage_disputes'), validateRequest(listDisputesSchema), asyncHandler(disputeController.listAll));

router.post('/', validateRequest(createDisputeSchema), asyncHandler(disputeController.create));
router.get('/:id', validateRequest(disputeIdSchema), asyncHandler(disputeController.getById));
router.post('/:id/seller-respond', validateRequest(sellerRespondSchema), asyncHandler(disputeController.sellerRespond));
router.post('/:id/escalate', validateRequest(escalateDisputeSchema), asyncHandler(disputeController.escalate));
router.post('/:id/cancel', validateRequest(disputeIdSchema), asyncHandler(disputeController.cancel));
router.post('/:id/resolve', requirePermission('manage_disputes'), validateRequest(resolveDisputeSchema), audited('dispute.resolve', 'DISPUTE', 'İtiraz sonuçlandırıldı'), asyncHandler(disputeController.resolve));

export const disputeRoutes = router;
