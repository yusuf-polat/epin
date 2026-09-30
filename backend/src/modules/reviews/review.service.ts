import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@/utils/errors';
import { clearProductCache } from '@/modules/products/product.service';
import { notificationService } from '@/modules/notifications/notification.service';
import { reviewRepository } from './review.repository';
import { AdminReviewListQuery, CreateReviewDTO } from './review.types';

async function findProduct(slug: string) {
  const product = await reviewRepository.findProductBySlug(slug);
  if (!product) throw new NotFoundError('Ürün bulunamadı', 'PRODUCT_NOT_FOUND');
  return product;
}

export const reviewService = {
  async list(slug: string) {
    const product = await findProduct(slug);
    return reviewRepository.findByProduct(product.id);
  },

  async create(userId: string, slug: string, { rating, comment }: CreateReviewDTO) {
    const product = await findProduct(slug);
    if (product.sellerId === userId) throw new BadRequestError('Kendi ilanınızı değerlendiremezsiniz', 'OWN_PRODUCT');

    if (await reviewRepository.findOne(userId, product.id)) {
      throw new ConflictError('Bu ürün için zaten bir değerlendirme yaptınız', 'ALREADY_REVIEWED');
    }
    const order = await reviewRepository.findEligibleOrder(userId, product.id);
    if (!order) {
      throw new ForbiddenError('Bu ürünü değerlendirebilmek için satın almış ve teslim almış olmanız gerekmektedir', 'NOT_PURCHASED');
    }

    const review = await reviewRepository.create({ userId, productId: product.id, orderId: order.id, rating, comment });
    await clearProductCache(product.slug);
    return review;
  },

  /** Yalnızca ilanın satıcısı, ilanına yapılan yoruma herkese açık yanıt verebilir */
  async reply(userId: string, slug: string, reviewId: string, reply: string | null) {
    const review = await reviewRepository.findById(reviewId);
    if (!review || review.product.slug !== slug) throw new NotFoundError('Yorum bulunamadı', 'REVIEW_NOT_FOUND');
    if (review.product.sellerId !== userId) throw new ForbiddenError('Yalnızca ilan sahibi yoruma yanıt verebilir', 'NOT_PRODUCT_OWNER');

    const updated = await reviewRepository.setReply(reviewId, reply);
    await clearProductCache(slug);
    if (reply) {
      await notificationService.send({
        userId: review.userId,
        type: 'PRODUCT',
        title: 'Yorumunuza Satıcı Yanıt Verdi',
        message: `"${review.product.title}" için yaptığınız değerlendirmeye satıcı yanıt verdi.`,
        link: `/urun/${slug}`,
      });
    }
    return updated;
  },

  listForAdmin(query: AdminReviewListQuery) {
    return reviewRepository.findForAdmin(query);
  },

  /** Kurallara aykırı yorumu kaldırır ve yazarını gerekçeyle bilgilendirir */
  async removeByModerator(reviewId: string, reason: string) {
    const review = await reviewRepository.findById(reviewId);
    if (!review) throw new NotFoundError('Yorum bulunamadı', 'REVIEW_NOT_FOUND');
    await reviewRepository.delete(reviewId);
    await clearProductCache(review.product.slug);
    await notificationService.send({
      userId: review.userId,
      type: 'SYSTEM',
      title: 'Değerlendirmeniz Kaldırıldı',
      message: `"${review.product.title}" için yaptığınız değerlendirme topluluk kurallarına aykırı bulunduğu için kaldırıldı. Gerekçe: ${reason}`,
      link: `/urun/${review.product.slug}`,
    });
    return { id: reviewId, deleted: true };
  },
};
