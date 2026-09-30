import { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { categoryService } from './category.service';

export const categoryController = {
  async list(_req: Request, res: Response) {
    return sendSuccess(res, await categoryService.list());
  },

  async getBySlug(req: Request, res: Response) {
    return sendSuccess(res, await categoryService.getBySlug(req.params.slug));
  },

  async create(req: Request, res: Response) {
    return sendSuccess(res, await categoryService.create(req.body), 'Kategori oluşturuldu', 201);
  },

  async update(req: Request, res: Response) {
    return sendSuccess(res, await categoryService.update(req.params.id, req.body), 'Kategori güncellendi');
  },

  async remove(req: Request, res: Response) {
    await categoryService.remove(req.params.id);
    return sendSuccess(res, null, 'Kategori silindi');
  },
};
