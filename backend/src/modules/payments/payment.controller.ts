import { Request, Response } from 'express';
import { PaymentProvider } from '@prisma/client';
import { sendPaginated, sendSuccess } from '@/utils/apiResponse';
import { buildMeta, PageParams } from '@/utils/pagination';
import { gatewayService } from './gateway.service';
import { paymentService } from './payment.service';
import { AdminPaymentListQuery } from './payment.types';

/** Sağlayıcılara iletilecek istemci IP'si (IPv4-mapped IPv6 önekleri temizlenir) */
const clientIp = (req: Request) => (req.ip ?? '').replace(/^::ffff:/, '') || '127.0.0.1';

export const paymentController = {
  async methods(_req: Request, res: Response) {
    return sendSuccess(res, await gatewayService.listPublic());
  },

  async checkout(req: Request, res: Response) {
    return sendSuccess(res, await paymentService.checkout(req.user!.id, req.body, clientIp(req)), 'Ödeme sayfası hazırlandı', 201);
  },

  async get(req: Request, res: Response) {
    return sendSuccess(res, await paymentService.getForUser(req.user!.id, req.params.id));
  },

  async listMine(req: Request, res: Response) {
    const page = req.query as unknown as PageParams;
    const { items, total } = await paymentService.listMine(req.user!.id, page);
    return sendPaginated(res, items, buildMeta(page, total));
  },

  async listGateways(_req: Request, res: Response) {
    return sendSuccess(res, await gatewayService.listForAdmin());
  },

  async updateGateway(req: Request, res: Response) {
    const result = await gatewayService.update(req.params.provider as PaymentProvider, req.user!.id, req.body);
    return sendSuccess(res, result, 'Ödeme yöntemi ayarları kaydedildi');
  },

  async listForAdmin(req: Request, res: Response) {
    const query = req.query as unknown as AdminPaymentListQuery;
    const { items, total } = await paymentService.listForAdmin(query);
    return sendPaginated(res, items, buildMeta(query, total));
  },

  async adminSync(req: Request, res: Response) {
    return sendSuccess(res, await paymentService.adminSync(req.params.id), 'Ödeme durumu sağlayıcıdan sorgulandı');
  },
};
