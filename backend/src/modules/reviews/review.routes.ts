import { Router } from 'express';
import { audited } from '@/modules/audit/audit.middleware';
import { authenticate, requirePermission } from '@/middlewares/auth.middleware';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { reviewController } from './review.controller';
import { adminDeleteReviewSchema, adminListReviewsSchema, createReviewSchema, deleteReplySchema, replyReviewSchema } from './review.schema';

// /api/products/:slug/reviews altında mount edilir
const router = Router({ mergeParams: true });

router.get('/', asyncHandler(reviewController.list));
router.post('/', authenticate, validateRequest(createReviewSchema), asyncHandler(reviewController.create));
router.put('/:reviewId/reply', authenticate, validateRequest(replyReviewSchema), asyncHandler(reviewController.reply));
router.delete('/:reviewId/reply', authenticate, validateRequest(deleteReplySchema), asyncHandler(reviewController.deleteReply));

export const reviewRoutes = router;

// /api/reviews: içerik denetimi
const admin = Router();

admin.use(authenticate, requirePermission('moderate_content'));
admin.get('/admin', validateRequest(adminListReviewsSchema), asyncHandler(reviewController.listForAdmin));
admin.delete(
  '/admin/:id',
  validateRequest(adminDeleteReviewSchema),
  audited('review.delete', 'REVIEW', 'Yorum denetim nedeniyle kaldırıldı'),
  asyncHandler(reviewController.removeByModerator)
);

export const reviewAdminRoutes = admin;
