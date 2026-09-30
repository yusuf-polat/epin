import { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { cartService } from './cart.service';

export const cartController = {
  async get(req: Request, res: Response) {
    return sendSuccess(res, await cartService.get(req.user!.id));
  },

  async addItem(req: Request, res: Response) {
    return sendSuccess(res, await cartService.addItem(req.user!.id, req.body), 'Ürün sepete eklendi');
  },

  async updateItem(req: Request, res: Response) {
    return sendSuccess(res, await cartService.updateItem(req.user!.id, req.params.itemId, req.body.quantity), 'Sepet güncellendi');
  },

  async removeItem(req: Request, res: Response) {
    return sendSuccess(res, await cartService.removeItem(req.user!.id, req.params.itemId), 'Ürün sepetten çıkarıldı');
  },

  async clear(req: Request, res: Response) {
    return sendSuccess(res, await cartService.clear(req.user!.id), 'Sepet temizlendi');
  },

  async merge(req: Request, res: Response) {
    return sendSuccess(res, await cartService.merge(req.user!.id, req.body.items));
  },
};
