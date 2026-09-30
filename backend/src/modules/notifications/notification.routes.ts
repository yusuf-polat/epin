import { Router } from 'express';
import { authenticate, requirePermission } from '@/middlewares/auth.middleware';
import { audited } from '@/modules/audit/audit.middleware';
import { sensitiveLimiter } from '@/middlewares/rateLimit';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { notificationController } from './notification.controller';
import { broadcastSchema, listBroadcastsSchema, listNotificationsSchema, notificationIdSchema, recipientCountSchema } from './notification.schema';

const router = Router();

router.use(authenticate);

router.get('/', validateRequest(listNotificationsSchema), asyncHandler(notificationController.list));
router.get('/unread-count', asyncHandler(notificationController.unreadCount));

// Toplu sistem bildirimi (yönetim)
router.get('/admin/broadcasts', requirePermission('broadcast_notifications'), validateRequest(listBroadcastsSchema), asyncHandler(notificationController.listBroadcasts));
router.get('/admin/recipient-count', requirePermission('broadcast_notifications'), validateRequest(recipientCountSchema), asyncHandler(notificationController.recipientCount));
router.post(
  '/admin/broadcast',
  requirePermission('broadcast_notifications'),
  sensitiveLimiter,
  validateRequest(broadcastSchema),
  audited('notification.broadcast', 'NOTIFICATION', 'Toplu sistem bildirimi gönderildi'),
  asyncHandler(notificationController.broadcast)
);
router.patch('/read-all', asyncHandler(notificationController.markAllAsRead));
router.patch('/:id/read', validateRequest(notificationIdSchema), asyncHandler(notificationController.markAsRead));
router.delete('/:id', validateRequest(notificationIdSchema), asyncHandler(notificationController.remove));

export const notificationRoutes = router;
