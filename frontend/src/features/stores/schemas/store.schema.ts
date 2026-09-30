import { z } from 'zod';
import { imageUrlField, slugField } from '@/lib/validations/common';

export const storeSchema = z.object({
  name: z.string().trim().min(3, 'Mağaza adı en az 3 karakter olmalıdır').max(50),
  slug: slugField,
  description: z.string().trim().max(500, 'Açıklama en fazla 500 karakter olabilir').optional(),
  logoUrl: imageUrlField,
  coverUrl: imageUrlField,
});

export type StoreValues = z.infer<typeof storeSchema>;

const TR: Record<string, string> = { ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u' };

/** Mağaza adından URL adresi üretir */
export const toStoreSlug = (t: string) =>
  t
    .split('')
    .map((c) => TR[c] ?? c)
    .join('')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
