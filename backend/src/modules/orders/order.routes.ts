import { Router } from 'express';
import { authenticate, requirePermission } from '@/middlewares/auth.middleware';
import { sensitiveLimiter } from '@/middlewares/rateLimit';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { orderController } from './order.controller';
import {
  adminOrdersSchema,
  checkoutSchema,
  deliverOrderSchema,
  listOrdersSchema,
  orderIdSchema,
  sellerCancelSchema,
  sellerOrdersSchema,
} from './order.schema';

const router = Router();

router.use(authenticate);

// Alıcı
router.get('/', validateRequest(listOrdersSchema), asyncHandler(orderController.listMine));
router.post('/checkout', sensitiveLimiter, validateRequest(checkoutSchema), asyncHandler(orderController.checkout));

// Satıcı (/:id'den önce)
router.get('/sales', validateRequest(sellerOrdersSchema), asyncHandler(orderController.listSales));

// Yönetim (/:id'den önce)
router.get('/admin', requirePermission('manage_orders'), validateRequest(adminOrdersSchema), asyncHandler(orderController.listForAdmin));

router.get('/:id', validateRequest(orderIdSchema), asyncHandler(orderController.getDetail));
router.post('/:id/confirm', sensitiveLimiter, validateRequest(orderIdSchema), asyncHandler(orderController.confirm));
router.post('/:id/cancel', sensitiveLimiter, validateRequest(orderIdSchema), asyncHandler(orderController.cancelOverdue));
router.post('/:id/deliver', sensitiveLimiter, validateRequest(deliverOrderSchema), asyncHandler(orderController.deliver));
router.post('/:id/seller-cancel', sensitiveLimiter, validateRequest(sellerCancelSchema), asyncHandler(orderController.cancelBySeller));

export const orderRoutes = router;
