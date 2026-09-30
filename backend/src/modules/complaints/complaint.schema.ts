import { z } from 'zod';
import { ComplaintStatus, ComplaintTarget } from '@prisma/client';
import { paginationQuery } from '@/utils/pagination';
import { COMPLAINT_REASONS, ComplaintReason } from './complaint.constants';

const reasons = Object.keys(COMPLAINT_REASONS) as [ComplaintReason, ...ComplaintReason[]];

export const createComplaintSchema = z.object({
  body: z
    .object({
      targetType: z.nativeEnum(ComplaintTarget),
      targetId: z.string().uuid(),
      reason: z.enum(reasons, { errorMap: () => ({ message: 'Geçerli bir şikâyet nedeni seçiniz' }) }),
      details: z.string().trim().max(1000).optional(),
    })
    .refine((d) => d.reason !== 'OTHER' || (d.details?.length ?? 0) >= 10, {
      message: '"Diğer" seçildiğinde en az 10 karakterlik açıklama yazınız',
      path: ['details'],
    }),
});

export const adminListComplaintsSchema = z.object({
  query: z.object({
    ...paginationQuery(20),
    status: z.nativeEnum(ComplaintStatus).optional(),
    targetType: z.nativeEnum(ComplaintTarget).optional(),
  }),
});

export const resolveComplaintSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['RESOLVED', 'DISMISSED']),
    note: z.string().trim().min(3, 'Açıklama en az 3 karakter olmalıdır').max(500),
    takeDown: z.boolean().optional(),
  }),
});
