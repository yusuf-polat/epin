import { apiClient } from '@/lib/api';
import { readFileAsDataUrl } from '@/lib/utils/format';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../constants';

export const uploadApi = {
  /** Görseli doğrular, base64'e çevirip yükler ve genel URL döner */
  async image(file: File): Promise<string> {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error('Yalnızca JPEG, PNG ve WebP görseller yüklenebilir');
    if (file.size > MAX_IMAGE_BYTES) throw new Error('Görsel boyutu en fazla 5MB olabilir');
    const image = await readFileAsDataUrl(file);
    const res = await apiClient.post<{ url: string }>('/upload', { image });
    return res.url;
  },
};
