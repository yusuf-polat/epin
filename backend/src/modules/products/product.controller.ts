import { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '@/utils/apiResponse';
import { buildMeta } from '@/utils/pagination';
import { productService } from './product.service';
import { AdminProductListQuery, ProductListQuery } from './product.types';

export const productController = {
  async list(req: Request, res: Response) {
    const query = req.query as unknown as ProductListQuery;
    const { total, items } = await productService.list(query);
    return sendPaginated(res, items, buildMeta(query, total));
  },

  async getBySlug(req: Request, res: Response) {
    return sendSuccess(res, await productService.getBySlug(req.params.slug, req.user));
  },

  async createPlatformProduct(req: Request, res: Response) {
    return sendSuccess(res, await productService.createPlatformProduct(req.body), 'Ürün başarıyla oluşturuldu', 201);
  },

  async createListing(req: Request, res: Response) {
    const result = await productService.createListing(req.user!.id, req.body);
    return sendSuccess(res, result, 'İlanınız oluşturuldu ve onay için incelemeye alındı', 201);
  },

  async myListings(req: Request, res: Response) {
    return sendSuccess(res, await productService.listSellerListings(req.user!.id));
  },

  async getListingForEdit(req: Request, res: Response) {
    return sendSuccess(res, await productService.getListingForEdit(req.params.id, req.user!));
  },

  async updateListing(req: Request, res: Response) {
    const result = await productService.updateListing(req.params.id, req.user!, req.body);
    return sendSuccess(res, result, result.requiresApproval ? 'İlan güncellendi ve yeniden onaya gönderildi' : 'İlan güncellendi');
  },

  async removeListing(req: Request, res: Response) {
    const result = await productService.removeListing(req.params.id, req.user!);
    return sendSuccess(res, result, result.closed ? 'İlan satışa kapatıldı' : 'İlan silindi');
  },

  async setListed(req: Request, res: Response) {
    const result = await productService.setListed(req.params.id, req.user!, req.body.isListed);
    return sendSuccess(res, result, result.isListed ? 'İlan yeniden yayına alındı' : 'İlan yayından kaldırıldı');
  },

  async addCodes(req: Request, res: Response) {
    const result = await productService.addCodes(req.params.id, req.user!, req.body);
    const skipped = result.skippedCount > 0 ? ` (${result.skippedCount} tekrar eden kod atlandı)` : '';
    return sendSuccess(res, result, `${result.addedCount} kod ilana eklendi${skipped}`);
  },

  async setStock(req: Request, res: Response) {
    return sendSuccess(res, await productService.setStock(req.params.id, req.user!, req.body.stockCount), 'Stok güncellendi');
  },

  async listForAdmin(req: Request, res: Response) {
    const query = req.query as unknown as AdminProductListQuery;
    const { total, items } = await productService.listForAdmin(query);
    return sendPaginated(res, items, buildMeta(query, total));
  },

  async approve(req: Request, res: Response) {
    return sendSuccess(res, await productService.approve(req.params.id, req.user!.id), 'Ürün onaylandı ve yayına alındı');
  },

  async reject(req: Request, res: Response) {
    return sendSuccess(res, await productService.reject(req.params.id, req.user!.id, req.body.reason), 'Ürün reddedildi');
  },
};
