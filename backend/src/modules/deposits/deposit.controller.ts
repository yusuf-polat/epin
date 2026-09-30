import { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '@/utils/apiResponse';
import { buildMeta, PageParams } from '@/utils/pagination';
import { depositService } from './deposit.service';
import { AdminDepositListQuery } from './deposit.types';

export const depositController = {
  async bankInfo(_req: Request, res: Response) {
    return sendSuccess(res, await depositService.getBankInfo());
  },

  async createCrypto(req: Request, res: Response) {
    const result = await depositService.createCrypto(req.user!.id, req.body);
    return sendSuccess(res, result, 'Kripto yükleme bildiriminiz alındı. İşlem ağda doğrulanınca bakiyeniz yüklenecek.', 201);
  },

  async create(req: Request, res: Response) {
    const result = await depositService.create(req.user!.id, req.body);
    return sendSuccess(res, result, 'Yükleme talebiniz oluşturuldu. Havale açıklamasına referans kodunu yazmayı unutmayınız.', 201);
  },

  async listMine(req: Request, res: Response) {
    const page = req.query as unknown as PageParams;
    const { items, total } = await depositService.listMine(req.user!.id, page);
    return sendPaginated(res, items, buildMeta(page, total));
  },

  async cancel(req: Request, res: Response) {
    return sendSuccess(res, await depositService.cancel(req.user!.id, req.params.id), 'Yükleme talebi iptal edildi');
  },

  async listForAdmin(req: Request, res: Response) {
    const query = req.query as unknown as AdminDepositListQuery;
    const { items, total } = await depositService.listForAdmin(query);
    return sendPaginated(res, items, buildMeta(query, total));
  },

  async approve(req: Request, res: Response) {
    return sendSuccess(res, await depositService.approve(req.user!.id, req.params.id, req.body.approvedAmount), 'Talep onaylandı, bakiye yüklendi');
  },

  async reject(req: Request, res: Response) {
    return sendSuccess(res, await depositService.reject(req.user!.id, req.params.id, req.body.reason), 'Talep reddedildi');
  },
};
