import { z } from 'zod';
import { PaginationMeta } from './apiResponse';

export const MAX_PAGE_LIMIT = 100;

/** Query string sayfalama alanları için ortak Zod şeması */
export const paginationQuery = (defaultLimit = 20) => ({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(defaultLimit),
});

export interface PageParams {
  page: number;
  limit: number;
}

export const toSkip = ({ page, limit }: PageParams) => (page - 1) * limit;

export const buildMeta = ({ page, limit }: PageParams, total: number, extra?: Record<string, unknown>): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
  ...extra,
});
