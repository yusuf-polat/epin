import { BadRequestError } from '@/utils/errors';
import { fileStorage } from './upload.storage';
import { MAX_IMAGE_BYTES } from './upload.constants';
import { ImageExtension } from './upload.types';

/** Dosya içeriğinin ilk baytlarından gerçek görsel türünü tespit eder */
function detectImageType(buffer: Buffer): ImageExtension | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

export const uploadService = {
  async saveImage(image: string) {
    // Halihazırda yüklenmiş / harici bir adres ise olduğu gibi döndür
    if (/^https?:\/\//.test(image) || image.startsWith('/')) {
      return { url: image, relativeUrl: image.startsWith('/') ? image : undefined };
    }

    const match = /^data:image\/[a-z+.-]+;base64,([A-Za-z0-9+/=\s]+)$/i.exec(image);
    if (!match) throw new BadRequestError('Geçersiz görsel verisi', 'INVALID_IMAGE');

    const buffer = Buffer.from(match[1], 'base64');
    if (buffer.length === 0) throw new BadRequestError('Görsel verisi boş', 'INVALID_IMAGE');
    if (buffer.length > MAX_IMAGE_BYTES) throw new BadRequestError('Görsel boyutu en fazla 5MB olabilir', 'IMAGE_TOO_LARGE');

    const extension = detectImageType(buffer);
    if (!extension) {
      throw new BadRequestError('Desteklenmeyen dosya türü. Sadece JPEG, PNG ve WebP formatları desteklenmektedir.', 'UNSUPPORTED_IMAGE');
    }
    return fileStorage.save(buffer, extension);
  },
};
