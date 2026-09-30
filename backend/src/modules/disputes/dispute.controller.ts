import { Request, Response } from 'express';
import { DisputeStatus } from '@prisma/client';
import { sendSuccess } from '@/utils/apiResponse';
import { disputeService } from './dispute.service';

export const disputeController = {
  async create(req: Request, res: Response) {
    const result = await disputeService.create(req.user!.id, req.body);
    return sendSuccess(res, result, 'İtirazınız açıldı. Ödeme karar verilene kadar donduruldu.', 201);
  },

  async listMine(req: Request, res: Response) {
    return sendSuccess(res, await disputeService.listForBuyer(req.user!.id));
  },

  async listForSeller(req: Request, res: Response) {
    return sendSuccess(res, await disputeService.listForSeller(req.user!.id));
  },

  async listAll(req: Request, res: Response) {
    return sendSuccess(res, await disputeService.listAll(req.query.status as DisputeStatus | undefined));
  },

  async getById(req: Request, res: Response) {
    return sendSuccess(res, await disputeService.getById(req.params.id, req.user!));
  },

  async sellerRespond(req: Request, res: Response) {
    return sendSuccess(res, await disputeService.sellerRespond(req.user!.id, req.params.id, req.body), 'İtiraz yanıtınız kaydedildi');
  },

  async escalate(req: Request, res: Response) {
    return sendSuccess(res, await disputeService.escalate(req.user!.id, req.params.id, req.body.description), 'İtirazınız destek ekibine iletildi');
  },

  async resolve(req: Request, res: Response) {
    const { decision, adminNotes } = req.body;
    return sendSuccess(res, await disputeService.resolve(req.user!.id, req.params.id, decision, adminNotes), 'Hakem kararı uygulandı');
  },

  async cancel(req: Request, res: Response) {
    return sendSuccess(res, await disputeService.cancel(req.user!.id, req.params.id), 'İtiraz geri çekildi');
  },
};
