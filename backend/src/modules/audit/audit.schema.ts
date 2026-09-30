import { z } from 'zod';
import { paginationQuery } from '@/utils/pagination';

export const listAuditSchema = z.object({
  query: z.object({
    ...paginationQuery(30),
    action: z.string().trim().max(60).optional(),
    targetType: z.string().trim().max(40).optional(),
    actorId: z.string().uuid().optional(),
    search: z.string().trim().max(100).optional(),
  }),
});
