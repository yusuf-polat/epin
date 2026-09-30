import { Request, Response } from 'express';
import { SellerRequestStatus } from '@prisma/client';
import { sendSuccess } from '@/utils/apiResponse';
import { sellerRequestService } from './seller-request.service';

export const sellerRequestController = {
  async create(req: Request, res: Response) {
    const result = await sellerRequestService.create(req.user!.id, req.body.reason);
    return sendSuccess(res, result, 'Satıcı başvurunuz alındı, inceleme bekleniyor', 201);
  },

  async listMine(req: Request, res: Response) {
    return sendSuccess(res, await sellerRequestService.listMine(req.user!.id));
  },

  async list(req: Request, res: Response) {
    return sendSuccess(res, await sellerRequestService.list(req.query.status as SellerRequestStatus | undefined));
  },

  async resolve(req: Request, res: Response) {
    const { action, adminNotes } = req.body;
    const result = await sellerRequestService.resolve(req.params.id, action, adminNotes);
    return sendSuccess(res, result, action === 'APPROVED' ? 'Başvuru onaylandı, satıcı yetkisi verildi' : 'Başvuru reddedildi');
  },
};
