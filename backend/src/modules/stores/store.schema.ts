import { z } from 'zod';
import { paginationQuery } from '@/utils/pagination';

const imagePath = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v.startsWith('/') || /^https?:\/\//.test(v), 'Geçerli bir görsel adresi giriniz');

export const createStoreSchema = z.object({
  body: z.object({
    name: z.string().trim().min(3, 'Mağaza adı en az 3 karakter olmalıdır').max(50, 'Mağaza adı en fazla 50 karakter olabilir'),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, 'Mağaza URL adı en az 3 karakter olmalıdır')
      .max(50, 'Mağaza URL adı en fazla 50 karakter olabilir')
      .regex(/^[a-z0-9-]+$/, 'URL sadece küçük harf, rakam ve tire içerebilir'),
    description: z.string().trim().max(500, 'Açıklama en fazla 500 karakter olabilir').optional(),
    logoUrl: imagePath,
    coverUrl: imagePath,
  }),
});

// Mağaza adı ve URL kurulumdan sonra değiştirilemez
export const updateStoreSchema = z.object({
  body: z
    .object({
      description: z.string().trim().max(500).optional(),
      logoUrl: imagePath.optional(),
      coverUrl: imagePath.optional(),
    })
    .strict('Mağaza adı ve URL adresi mağaza kurulduktan sonra değiştirilemez'),
});

export const listStoresSchema = z.object({
  query: z.object({
    ...paginationQuery(20),
    search: z.string().trim().max(100).optional(),
  }),
});

export const storeProductsSchema = z.object({
  params: z.object({ slug: z.string().trim().toLowerCase() }),
  query: z.object(paginationQuery(12)),
});

export const storeIdSchema = z.object({ params: z.object({ id: z.string().uuid() }) });
