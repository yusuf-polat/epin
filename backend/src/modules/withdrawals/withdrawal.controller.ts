import { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '@/utils/apiResponse';
import { buildMeta, PageParams } from '@/utils/pagination';
import { withdrawalService } from './withdrawal.service';
import { AdminWithdrawalListQuery } from './withdrawal.types';

export const withdrawalController = {
  async create(req: Request, res: Response) {
    const result = await withdrawalService.create(req.user!.id, req.body);
    return sendSuccess(res, result, 'Para çekme talebiniz alındı. Tutar onaylanana kadar bakiyenizden bloke edildi.', 201);
  },

  async listMine(req: Request, res: Response) {
    const page = req.query as unknown as PageParams;
    const { items, total } = await withdrawalService.listMine(req.user!.id, page);
    return sendPaginated(res, items, buildMeta(page, total));
  },

  async cancel(req: Request, res: Response) {
    return sendSuccess(res, await withdrawalService.cancel(req.user!.id, req.params.id), 'Talep iptal edildi, tutar bakiyenize iade edildi');
  },

  async listForAdmin(req: Request, res: Response) {
    const query = req.query as unknown as AdminWithdrawalListQuery;
    const { items, total } = await withdrawalService.listForAdmin(query);
    return sendPaginated(res, items, buildMeta(query, total));
  },

  async markPaid(req: Request, res: Response) {
    return sendSuccess(res, await withdrawalService.markPaid(req.user!.id, req.params.id, req.body.transferRef), 'Talep ödendi olarak işaretlendi');
  },

  async reject(req: Request, res: Response) {
    return sendSuccess(res, await withdrawalService.reject(req.user!.id, req.params.id, req.body.reason), 'Talep reddedildi, tutar iade edildi');
  },
};
