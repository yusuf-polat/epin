import { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '@/utils/apiResponse';
import { buildMeta, PageParams } from '@/utils/pagination';
import { orderService } from './order.service';
import { AdminOrderListQuery, SellerOrderFilter } from './order.types';

export const orderController = {
  async checkout(req: Request, res: Response) {
    const result = await orderService.checkout(req.user!.id, req.body);
    const hasManual = result.orders.some((o) => o.deliveryType === 'MANUAL');
    const message = hasManual
      ? 'Siparişiniz oluşturuldu. Anında teslimatlı kodlar teslim edildi, satıcı teslimatlı ürünler hazırlanıyor.'
      : 'Sipariş oluşturuldu ve dijital kodlar anında teslim edildi!';
    return sendSuccess(res, result, message, 201);
  },

  async listMine(req: Request, res: Response) {
    const page = req.query as unknown as PageParams;
    const { items, total } = await orderService.listForBuyer(req.user!.id, page);
    return sendPaginated(res, items, buildMeta(page, total));
  },

  async listSales(req: Request, res: Response) {
    const query = req.query as unknown as PageParams & { filter: SellerOrderFilter };
    const { items, total } = await orderService.listForSeller(req.user!.id, query.filter, query);
    return sendPaginated(res, items, buildMeta(query, total));
  },

  async listForAdmin(req: Request, res: Response) {
    const query = req.query as unknown as AdminOrderListQuery;
    const { items, total } = await orderService.listForAdmin(query);
    return sendPaginated(res, items, buildMeta(query, total));
  },

  async getDetail(req: Request, res: Response) {
    return sendSuccess(res, await orderService.getDetail(req.params.id, req.user!));
  },

  async deliver(req: Request, res: Response) {
    return sendSuccess(res, await orderService.deliver(req.user!.id, req.params.id, req.body), 'Sipariş alıcıya teslim edildi');
  },

  async confirm(req: Request, res: Response) {
    return sendSuccess(res, await orderService.confirm(req.user!.id, req.params.id), 'Teslimat onaylandı, ödeme satıcıya aktarıldı');
  },

  async cancelOverdue(req: Request, res: Response) {
    return sendSuccess(res, await orderService.cancelOverdue(req.user!.id, req.params.id), 'Sipariş iptal edildi, ödemeniz iade edildi');
  },

  async cancelBySeller(req: Request, res: Response) {
    const result = await orderService.cancelBySeller(req.user!.id, req.params.id, req.body.reason);
    return sendSuccess(res, result, 'Sipariş iptal edildi, alıcıya iade yapıldı');
  },
};
