import { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '@/utils/apiResponse';
import { buildMeta, PageParams } from '@/utils/pagination';
import { pinService } from './pin.service';

export const pinController = {
  async listMine(req: Request, res: Response) {
    const page = req.query as unknown as PageParams;
    const { items, total } = await pinService.listMine(req.user!.id, page);
    return sendPaginated(res, items, buildMeta(page, total));
  },

  async reveal(req: Request, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    return sendSuccess(res, await pinService.reveal(req.params.id, req.user!.id));
  },
};
