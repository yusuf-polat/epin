import { z } from 'zod';

/**
 * Formlarda tekrar kullanılan Zod parçaları. Frontend doğrulaması yalnızca
 * kullanıcı deneyimi içindir; backend her isteği yeniden doğrular.
 */
export const emailField = z.string().trim().min(1, 'E-posta gereklidir').email('Geçerli bir e-posta adresi giriniz');

export const passwordField = z.string().min(8, 'Şifre en az 8 karakter olmalıdır').max(128);

export const requiredText = (min: number, label: string, max = 1000) =>
  z.string().trim().min(min, `${label} en az ${min} karakter olmalıdır`).max(max, `${label} en fazla ${max} karakter olabilir`);

/** Input'tan gelen sayı metnini doğrular (boş bırakılabilir alanlar için optionalNumber) */
export const positiveNumber = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} sayı olmalıdır` }).positive(`${label} 0'dan büyük olmalıdır`);

export const optionalNumber = z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number().positive().optional());

export const imageUrlField = z
  .string()
  .min(1, 'Görsel gereklidir')
  .refine((v) => v.startsWith('/') || /^https?:\/\//.test(v), 'Geçerli bir görsel adresi giriniz');

export const slugField = z
  .string()
  .trim()
  .min(3, 'En az 3 karakter olmalıdır')
  .max(50)
  .regex(/^[a-z0-9-]+$/, 'Yalnızca küçük harf, rakam ve tire kullanılabilir');

/** Çok satırlı metni boş olmayan, benzersiz satırlara böler (kod listeleri için) */
export const splitLines = (text: string) => [...new Set(text.split('\n').map((l) => l.trim()).filter(Boolean))];
