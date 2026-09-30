import { z } from 'zod';
import { imageUrlField } from '@/lib/validations/common';

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Kategori adı en az 2 karakter olmalıdır').max(80),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug en az 2 karakter olmalıdır')
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Yalnızca küçük harf, rakam ve tire kullanılabilir'),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(60).optional(),
  imageUrl: imageUrlField,
  sortOrder: z.coerce.number().int().min(0).max(10000),
  // Boş bırakılırsa platform varsayılan komisyonu uygulanır
  commissionRate: z.preprocess(
    (v) => (v === '' || v == null ? null : v),
    z.coerce.number().min(0, 'Komisyon negatif olamaz').max(50, 'Komisyon en fazla %50 olabilir').nullable()
  ),
});

export type CategoryFormInput = z.input<typeof categorySchema>;
export type CategoryValues = z.output<typeof categorySchema>;
