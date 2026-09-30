import { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '@/utils/apiResponse';
import { buildMeta, PageParams } from '@/utils/pagination';
import { walletService } from './wallet.service';
import { AdminLedgerQuery } from './wallet.types';

export const walletController = {
  async summary(req: Request, res: Response) {
    return sendSuccess(res, await walletService.getSummary(req.user!.id));
  },

  async transactions(req: Request, res: Response) {
    const page = req.query as unknown as PageParams;
    const { items, total } = await walletService.listTransactions(req.user!.id, page);
    return sendPaginated(res, items, buildMeta(page, total));
  },

  async topup(req: Request, res: Response) {
    const result = await walletService.topup(req.user!.id, req.body.amount);
    return sendSuccess(res, result, 'Cüzdan bakiyesi başarıyla yüklendi');
  },

  async adminLedger(req: Request, res: Response) {
    const query = req.query as unknown as AdminLedgerQuery;
    const { items, total } = await walletService.listAllTransactions(query);
    return sendPaginated(res, items, buildMeta(query, total));
  },

  async adminAdjust(req: Request, res: Response) {
    const result = await walletService.adminAdjust(req.params.userId, req.body.amount, req.body.note);
    return sendSuccess(res, result, 'Kullanıcı bakiyesi güncellendi');
  },
};
