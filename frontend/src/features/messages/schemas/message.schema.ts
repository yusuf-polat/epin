import { z } from 'zod';
import { MAX_MESSAGE_LENGTH } from '../constants';

export const sendMessageSchema = z.object({
  text: z.string().trim().min(1, 'Mesaj boş olamaz').max(MAX_MESSAGE_LENGTH),
});

export type SendMessageValues = z.infer<typeof sendMessageSchema>;
