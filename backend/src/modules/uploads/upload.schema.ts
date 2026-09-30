import { z } from 'zod';
import { MAX_IMAGE_BASE64_LENGTH } from './upload.constants';

export const uploadImageSchema = z.object({
  body: z.object({
    // base64 data URL (~5MB görsel ≈ 6.7MB metin)
    image: z.string().min(1, 'Görsel verisi bulunamadı').max(MAX_IMAGE_BASE64_LENGTH, 'Görsel boyutu en fazla 5MB olabilir'),
  }),
});
