import { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '@/utils/apiResponse';
import { buildMeta } from '@/utils/pagination';
import { complaintService } from './complaint.service';
import { AdminComplaintListQuery } from './complaint.types';

export const complaintController = {
  async create(req: Request, res: Response) {
    const complaint = await complaintService.create(req.user!.id, req.body);
    return sendSuccess(res, complaint, 'Şikâyetiniz alındı. Ekibimiz en kısa sürede inceleyecek.', 201);
  },

  async listForAdmin(req: Request, res: Response) {
    const query = req.query as unknown as AdminComplaintListQuery;
    const { items, total } = await complaintService.listForAdmin(query);
    return sendPaginated(res, items, buildMeta(query, total));
  },

  async resolve(req: Request, res: Response) {
    return sendSuccess(res, await complaintService.resolve(req.user!.id, req.params.id, req.body), 'Şikâyet sonuçlandırıldı');
  },
};
