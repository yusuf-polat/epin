import { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { reportService } from './report.service';

export const reportController = {
  async dashboard(req: Request, res: Response) {
    return sendSuccess(res, await reportService.dashboard(req.user!));
  },
};
