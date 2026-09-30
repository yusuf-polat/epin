import { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '@/utils/apiResponse';
import { buildMeta, PageParams } from '@/utils/pagination';
import { storeService } from './store.service';
import { StoreListQuery } from './store.types';

export const storeController = {
  async create(req: Request, res: Response) {
    return sendSuccess(res, await storeService.create(req.user!.id, req.body), 'Mağazanız başarıyla oluşturuldu', 201);
  },

  async update(req: Request, res: Response) {
    return sendSuccess(res, await storeService.update(req.user!.id, req.body), 'Mağaza bilgileri güncellendi');
  },

  async getMine(req: Request, res: Response) {
    return sendSuccess(res, await storeService.getMine(req.user!.id));
  },

  async getBySlug(req: Request, res: Response) {
    return sendSuccess(res, await storeService.getBySlug(req.params.slug));
  },

  async listPublic(req: Request, res: Response) {
    const { page, limit, search } = req.query as unknown as StoreListQuery;
    const { total, items } = await storeService.listPublic({ page, limit }, search);
    return sendPaginated(res, items, buildMeta({ page, limit }, total));
  },

  async listForAdmin(req: Request, res: Response) {
    const { page, limit, search } = req.query as unknown as StoreListQuery;
    const { total, items } = await storeService.listForAdmin({ page, limit }, search);
    return sendPaginated(res, items, buildMeta({ page, limit }, total));
  },

  async listProducts(req: Request, res: Response) {
    const page = req.query as unknown as PageParams;
    const { total, items } = await storeService.listProducts(req.params.slug, page);
    return sendPaginated(res, items, buildMeta(page, total));
  },

  async toggleActive(req: Request, res: Response) {
    const store = await storeService.toggleActive(req.params.id);
    return sendSuccess(res, store, store.isActive ? 'Mağaza aktifleştirildi' : 'Mağaza askıya alındı');
  },
};
