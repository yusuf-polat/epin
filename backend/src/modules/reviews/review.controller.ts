import { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '@/utils/apiResponse';
import { buildMeta } from '@/utils/pagination';
import { AdminReviewListQuery } from './review.types';
import { reviewService } from './review.service';

export const reviewController = {
  async list(req: Request, res: Response) {
    return sendSuccess(res, await reviewService.list(req.params.slug));
  },

  async create(req: Request, res: Response) {
    const review = await reviewService.create(req.user!.id, req.params.slug, req.body);
    return sendSuccess(res, review, 'Yorumunuz başarıyla eklendi', 201);
  },

  async reply(req: Request, res: Response) {
    const review = await reviewService.reply(req.user!.id, req.params.slug, req.params.reviewId, req.body.reply);
    return sendSuccess(res, review, 'Yanıtınız yayınlandı');
  },

  async deleteReply(req: Request, res: Response) {
    const review = await reviewService.reply(req.user!.id, req.params.slug, req.params.reviewId, null);
    return sendSuccess(res, review, 'Yanıtınız kaldırıldı');
  },

  async listForAdmin(req: Request, res: Response) {
    const query = req.query as unknown as AdminReviewListQuery;
    const { items, total } = await reviewService.listForAdmin(query);
    return sendPaginated(res, items, buildMeta(query, total));
  },

  async removeByModerator(req: Request, res: Response) {
    return sendSuccess(res, await reviewService.removeByModerator(req.params.id, req.body.reason), 'Yorum kaldırıldı');
  },
};
