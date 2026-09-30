import { Router } from 'express';
import { audited } from '@/modules/audit/audit.middleware';
import { authenticate, requirePermission, requireSeller } from '@/middlewares/auth.middleware';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { storeController } from './store.controller';
import { createStoreSchema, listStoresSchema, storeIdSchema, storeProductsSchema, updateStoreSchema } from './store.schema';

const router = Router();

// Oturum sahibi / yönetim (/:slug'dan önce)
router.get('/mine', authenticate, asyncHandler(storeController.getMine));
router.post('/', authenticate, requireSeller, validateRequest(createStoreSchema), asyncHandler(storeController.create));
router.put('/', authenticate, requireSeller, validateRequest(updateStoreSchema), asyncHandler(storeController.update));
router.get('/admin', authenticate, requirePermission('manage_stores'), validateRequest(listStoresSchema), asyncHandler(storeController.listForAdmin));
router.patch('/admin/:id/toggle-active', authenticate, requirePermission('manage_stores'), validateRequest(storeIdSchema), audited('store.toggle', 'STORE', 'Mağaza durumu değiştirildi'), asyncHandler(storeController.toggleActive));

// Herkese açık
router.get('/', validateRequest(listStoresSchema), asyncHandler(storeController.listPublic));
router.get('/:slug', asyncHandler(storeController.getBySlug));
router.get('/:slug/products', validateRequest(storeProductsSchema), asyncHandler(storeController.listProducts));

export const storeRoutes = router;
