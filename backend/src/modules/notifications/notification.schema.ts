import { z } from 'zod';
import { NotificationType } from '@prisma/client';
import { paginationQuery } from '@/utils/pagination';
import { BROADCAST_AUDIENCES } from './broadcast.service';

export const listNotificationsSchema = z.object({
  query: z.object({
    ...paginationQuery(10),
    type: z.nativeEnum(NotificationType).optional(),
  }),
});

export const notificationIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const broadcastSchema = z.object({
  body: z
    .object({
      audience: z.enum(BROADCAST_AUDIENCES),
      email: z.string().trim().toLowerCase().email('Geçerli bir e-posta adresi giriniz').optional(),
      title: z.string().trim().min(3, 'Başlık en az 3 karakter olmalıdır').max(120),
      message: z.string().trim().min(5, 'Mesaj en az 5 karakter olmalıdır').max(2000),
      // Yalnızca site içi bağlantı (açık yönlendirme engellenir)
      link: z
        .string()
        .trim()
        .max(300)
        .regex(/^\/(?!\/)[^\s]*$/, 'Bağlantı "/" ile başlayan site içi bir adres olmalıdır')
        .optional()
        .or(z.literal('')),
      sendEmail: z.boolean().default(false),
    })
    .refine((d) => d.audience !== 'USER' || !!d.email, { message: 'Kullanıcının e-posta adresini giriniz', path: ['email'] }),
});

export const recipientCountSchema = z.object({
  query: z.object({ audience: z.enum(BROADCAST_AUDIENCES), email: z.string().trim().email().optional() }),
});

export const listBroadcastsSchema = z.object({ query: z.object(paginationQuery(10)) });
