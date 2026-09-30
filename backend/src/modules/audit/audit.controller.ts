import { Request, Response } from 'express';
import { sendPaginated } from '@/utils/apiResponse';
import { buildMeta } from '@/utils/pagination';
import { auditService } from './audit.service';
import { AuditListQuery } from './audit.types';

export const auditController = {
  async list(req: Request, res: Response) {
    const query = req.query as unknown as AuditListQuery;
    const { items, total } = await auditService.list(query);
    return sendPaginated(res, items, buildMeta(query, total));
  },
};
