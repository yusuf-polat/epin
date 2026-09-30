import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { cartController } from './cart.controller';
import { addToCartSchema, cartItemIdSchema, mergeCartSchema, updateCartItemSchema } from './cart.schema';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(cartController.get));
router.post('/items', validateRequest(addToCartSchema), asyncHandler(cartController.addItem));
router.post('/merge', validateRequest(mergeCartSchema), asyncHandler(cartController.merge));
router.patch('/items/:itemId', validateRequest(updateCartItemSchema), asyncHandler(cartController.updateItem));
router.delete('/items/:itemId', validateRequest(cartItemIdSchema), asyncHandler(cartController.removeItem));
router.delete('/', asyncHandler(cartController.clear));

export const cartRoutes = router;
