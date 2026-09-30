import { z } from 'zod';

const categoryBody = z.object({
  name: z.string().trim().min(2, 'Kategori adı en az 2 karakter olmalıdır').max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Slug en az 2 karakter olmalıdır')
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug yalnızca küçük harf, rakam ve tire içerebilir'),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(60).optional(),
  imageUrl: z.string().trim().min(1, 'Kategori görseli (300x180) zorunludur').max(500),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  // null: platform varsayılan komisyonu kullanılır
  commissionRate: z.number().min(0, 'Komisyon negatif olamaz').max(50, 'Komisyon en fazla %50 olabilir').nullable().optional(),
});

const idParams = z.object({ id: z.string().uuid() });

export const createCategorySchema = z.object({ body: categoryBody });

export const updateCategorySchema = z.object({ params: idParams, body: categoryBody.partial() });

export const categoryIdSchema = z.object({ params: idParams });
