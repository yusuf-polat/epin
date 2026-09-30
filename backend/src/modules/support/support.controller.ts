import { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { supportService } from './support.service';
import { TicketFilter } from './support.types';

export const supportController = {
  async create(req: Request, res: Response) {
    return sendSuccess(res, await supportService.create(req.user!.id, req.body), 'Destek talebiniz oluşturuldu', 201);
  },

  async listMine(req: Request, res: Response) {
    return sendSuccess(res, await supportService.listMine(req.user!.id));
  },

  async getById(req: Request, res: Response) {
    return sendSuccess(res, await supportService.getById(req.params.id, req.user!));
  },

  async addMessage(req: Request, res: Response) {
    return sendSuccess(res, await supportService.addMessage(req.params.id, req.user!, req.body.message), undefined, 201);
  },

  async listAll(req: Request, res: Response) {
    const { status, category, search } = req.query as TicketFilter;
    return sendSuccess(res, await supportService.listAll({ status, category, search }));
  },

  async update(req: Request, res: Response) {
    return sendSuccess(res, await supportService.update(req.params.id, req.body), 'Destek talebi güncellendi');
  },
};
