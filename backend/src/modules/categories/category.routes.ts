import { Router } from 'express';
import { audited } from '@/modules/audit/audit.middleware';
import { authenticate, requirePermission } from '@/middlewares/auth.middleware';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { categoryController } from './category.controller';
import { categoryIdSchema, createCategorySchema, updateCategorySchema } from './category.schema';

const router = Router();

router.get('/', asyncHandler(categoryController.list));
router.get('/:slug', asyncHandler(categoryController.getBySlug));

router.post('/', authenticate, requirePermission('manage_categories'), validateRequest(createCategorySchema), audited('category.create', 'CATEGORY', 'Kategori oluşturuldu'), asyncHandler(categoryController.create));
router.put('/:id', authenticate, requirePermission('manage_categories'), validateRequest(updateCategorySchema), audited('category.update', 'CATEGORY', 'Kategori güncellendi'), asyncHandler(categoryController.update));
router.delete('/:id', authenticate, requirePermission('manage_categories'), validateRequest(categoryIdSchema), audited('category.delete', 'CATEGORY', 'Kategori silindi'), asyncHandler(categoryController.remove));

export const categoryRoutes = router;
