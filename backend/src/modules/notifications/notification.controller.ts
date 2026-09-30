import { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '@/utils/apiResponse';
import { buildMeta } from '@/utils/pagination';
import { notificationService } from './notification.service';
import { NotificationListQuery } from './notification.types';
import { BroadcastAudience, broadcastService } from './broadcast.service';
import { PageParams } from '@/utils/pagination';

export const notificationController = {
  async list(req: Request, res: Response) {
    const { page, limit, type } = req.query as unknown as NotificationListQuery;
    const { items, total, unreadCount } = await notificationService.list(req.user!.id, { page, limit }, type);
    return sendPaginated(res, items, buildMeta({ page, limit }, total, { unreadCount }));
  },

  async unreadCount(req: Request, res: Response) {
    const count = await notificationService.countUnread(req.user!.id);
    return sendSuccess(res, { count });
  },

  async markAsRead(req: Request, res: Response) {
    await notificationService.markAsRead(req.user!.id, req.params.id);
    return sendSuccess(res, null, 'Bildirim okundu olarak işaretlendi');
  },

  async markAllAsRead(req: Request, res: Response) {
    await notificationService.markAllAsRead(req.user!.id);
    return sendSuccess(res, null, 'Tüm bildirimler okundu olarak işaretlendi');
  },

  async broadcast(req: Request, res: Response) {
    const result = await broadcastService.send(req.user!.id, req.body);
    const mail = result.emailQueued ? ' E-postalar arka planda gönderiliyor.' : '';
    return sendSuccess(res, result, `${result.recipientCount} kullanıcıya bildirim gönderildi.${mail}`, 201);
  },

  async recipientCount(req: Request, res: Response) {
    const { audience, email } = req.query as { audience: BroadcastAudience; email?: string };
    return sendSuccess(res, { count: await broadcastService.countRecipients(audience, email) });
  },

  async listBroadcasts(req: Request, res: Response) {
    const page = req.query as unknown as PageParams;
    const { items, total } = await broadcastService.list(page);
    return sendPaginated(res, items, buildMeta(page, total));
  },

  async remove(req: Request, res: Response) {
    await notificationService.remove(req.user!.id, req.params.id);
    return sendSuccess(res, null, 'Bildirim silindi');
  },
};
