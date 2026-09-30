import { z } from 'zod';
import { MAX_MESSAGE_LENGTH } from './message.constants';

const idParams = z.object({ id: z.string().uuid() });

export const startConversationSchema = z.object({
  body: z.object({
    targetUserId: z.string().uuid('Geçersiz kullanıcı'),
    productId: z.string().uuid().optional(),
  }),
});

export const conversationIdSchema = z.object({ params: idParams });

export const sendMessageSchema = z.object({
  params: idParams,
  body: z.object({ text: z.string().trim().min(1, 'Mesaj alanı boş bırakılamaz').max(MAX_MESSAGE_LENGTH, `Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir`) }),
});
