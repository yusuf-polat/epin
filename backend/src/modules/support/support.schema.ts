import { z } from 'zod';
import { TicketPriority, TicketStatus } from '@prisma/client';

const idParams = z.object({ id: z.string().uuid() });

export const createTicketSchema = z.object({
  body: z.object({
    subject: z.string().trim().min(3, 'Konu en az 3 karakter olmalıdır').max(150),
    category: z.string().trim().min(2).max(50).default('Genel Destek'),
    priority: z.nativeEnum(TicketPriority).default('MEDIUM'),
    message: z.string().trim().min(5, 'Mesaj en az 5 karakter olmalıdır').max(5000),
  }),
});

export const ticketIdSchema = z.object({ params: idParams });

export const addTicketMessageSchema = z.object({
  params: idParams,
  body: z.object({ message: z.string().trim().min(1, 'Mesaj alanı boş bırakılamaz').max(5000) }),
});

export const listTicketsSchema = z.object({
  query: z.object({
    status: z.nativeEnum(TicketStatus).optional(),
    category: z.string().trim().max(50).optional(),
    search: z.string().trim().max(100).optional(),
  }),
});

export const updateTicketSchema = z.object({
  params: idParams,
  body: z
    .object({
      status: z.nativeEnum(TicketStatus).optional(),
      priority: z.nativeEnum(TicketPriority).optional(),
    })
    .refine((b) => b.status || b.priority, 'Güncellenecek bir alan belirtiniz'),
});
