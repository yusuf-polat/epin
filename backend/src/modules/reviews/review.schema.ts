import { z } from 'zod';
import { paginationQuery } from '@/utils/pagination';
import { MAX_COMMENT_LENGTH, MAX_RATING, MAX_REPLY_LENGTH, MIN_RATING } from './review.constants';

export const createReviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(MIN_RATING, 'Puan 1-5 arasında olmalıdır').max(MAX_RATING, 'Puan 1-5 arasında olmalıdır'),
    comment: z.string().trim().min(3, 'Yorum en az 3 karakter olmalıdır').max(MAX_COMMENT_LENGTH),
  }),
});

const reviewParams = z.object({ slug: z.string().min(1), reviewId: z.string().uuid() });

export const replyReviewSchema = z.object({
  params: reviewParams,
  body: z.object({ reply: z.string().trim().min(2, 'Yanıt en az 2 karakter olmalıdır').max(MAX_REPLY_LENGTH) }),
});

export const deleteReplySchema = z.object({ params: reviewParams });

export const adminListReviewsSchema = z.object({
  query: z.object({
    ...paginationQuery(20),
    rating: z.coerce.number().int().min(MIN_RATING).max(MAX_RATING).optional(),
    search: z.string().trim().max(100).optional(),
  }),
});

export const adminDeleteReviewSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ reason: z.string().trim().min(3, 'Silme gerekçesi en az 3 karakter olmalıdır').max(300) }),
});
