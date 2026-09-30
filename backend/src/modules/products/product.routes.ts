import { Router } from 'express';
import { audited } from '@/modules/audit/audit.middleware';
import { authenticate, optionalAuthenticate, requirePermission, requireSeller } from '@/middlewares/auth.middleware';
import { sensitiveLimiter } from '@/middlewares/rateLimit';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { reviewRoutes } from '@/modules/reviews/review.routes';
import { productController } from './product.controller';
import {
  addCodesSchema,
  adminListProductsSchema,
  createListingSchema,
  createProductSchema,
  listProductsSchema,
  productIdSchema,
  rejectProductSchema,
  setListedSchema,
  setStockSchema,
  updateListingSchema,
} from './product.schema';

const router = Router();

// ─── Vitrin ────────────────────────────────────────────────────────────────────
router.get('/', validateRequest(listProductsSchema), asyncHandler(productController.list));

// ─── Onay süreci (/:slug'dan önce tanımlanmalı) ────────────────────────────────
router.get('/admin', authenticate, requirePermission('approve_listings'), validateRequest(adminListProductsSchema), asyncHandler(productController.listForAdmin));
router.post('/admin/:id/approve', authenticate, requirePermission('approve_listings'), validateRequest(productIdSchema), audited('product.approve', 'PRODUCT', 'İlan onaylandı'), asyncHandler(productController.approve));
router.post('/admin/:id/reject', authenticate, requirePermission('approve_listings'), validateRequest(rejectProductSchema), audited('product.reject', 'PRODUCT', 'İlan reddedildi'), asyncHandler(productController.reject));

// ─── Platform ürünü oluşturma ──────────────────────────────────────────────────
router.post('/', authenticate, requirePermission('manage_products'), validateRequest(createProductSchema), audited('product.create', 'PRODUCT', 'Platform ürünü oluşturuldu'), asyncHandler(productController.createPlatformProduct));

// ─── Satıcı ilanları ───────────────────────────────────────────────────────────
router.get('/mine', authenticate, asyncHandler(productController.myListings));
router.post('/listings', authenticate, requireSeller, sensitiveLimiter, validateRequest(createListingSchema), asyncHandler(productController.createListing));
router.get('/mine/:id', authenticate, validateRequest(productIdSchema), asyncHandler(productController.getListingForEdit));
router.put('/:id', authenticate, sensitiveLimiter, validateRequest(updateListingSchema), asyncHandler(productController.updateListing));
router.delete('/:id', authenticate, validateRequest(productIdSchema), asyncHandler(productController.removeListing));
router.patch('/:id/visibility', authenticate, validateRequest(setListedSchema), asyncHandler(productController.setListed));
router.post('/:id/codes', authenticate, sensitiveLimiter, validateRequest(addCodesSchema), asyncHandler(productController.addCodes));
router.patch('/:id/stock', authenticate, validateRequest(setStockSchema), asyncHandler(productController.setStock));

// ─── Ürün detayı ve yorumlar ───────────────────────────────────────────────────
router.get('/:slug', optionalAuthenticate, asyncHandler(productController.getBySlug));
router.use('/:slug/reviews', reviewRoutes);

export const productRoutes = router;
