import { z } from 'zod';
import { requiredText } from '@/lib/validations/common';

export const createTicketSchema = z.object({
  subject: requiredText(3, 'Konu', 150),
  category: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  message: requiredText(5, 'Mesaj', 5000),
});

export const replySchema = z.object({ message: z.string().trim().min(1, 'Mesaj boş olamaz').max(5000) });

export type CreateTicketValues = z.infer<typeof createTicketSchema>;
export type ReplyValues = z.infer<typeof replySchema>;
