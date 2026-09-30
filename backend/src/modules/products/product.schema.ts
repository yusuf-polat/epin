import { z } from 'zod';
import { paginationQuery } from '@/utils/pagination';
import { DEFAULT_REGION, MAX_CODES_PER_REQUEST, MAX_GALLERY_IMAGES, REGIONS } from './product.constants';

const regionField = z.enum(REGIONS, { errorMap: () => ({ message: 'Geçerli bir bölge seçiniz' }) }).default(DEFAULT_REGION);

const booleanQuery = z.enum(['true', 'false']).transform((v) => v === 'true');
const imagePath = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v.startsWith('/') || /^https?:\/\//.test(v), 'Geçerli bir görsel adresi giriniz');
const code = z.string().trim().min(1, 'Kod boş olamaz').max(500, 'Kod en fazla 500 karakter olabilir');
const codes = z.array(code).max(MAX_CODES_PER_REQUEST, `Tek seferde en fazla ${MAX_CODES_PER_REQUEST} kod eklenebilir`);
const idParams = z.object({ id: z.string().uuid() });

export const listProductsSchema = z.object({
  query: z.object({
    ...paginationQuery(20),
    category: z.string().trim().max(80).optional(),
    brand: z.string().trim().max(80).optional(),
    region: z.enum(REGIONS).optional(),
    search: z.string().trim().max(100).optional(),
    featured: booleanQuery.optional(),
    popular: booleanQuery.optional(),
    isMarketplace: booleanQuery.optional(),
    delivery: z.enum(['INSTANT', 'MANUAL']).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sort: z.enum(['popular', 'newest']).optional(),
  }),
});

export const adminListProductsSchema = z.object({
  query: z.object({
    ...paginationQuery(20),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ALL']).optional(),
    search: z.string().trim().max(100).optional(),
  }),
});

export const createProductSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2, 'Ürün başlığı en az 2 karakter olmalıdır').max(150),
    slug: z.string().trim().toLowerCase().min(2).max(160).regex(/^[a-z0-9-]+$/, 'Slug yalnızca küçük harf, rakam ve tire içerebilir'),
    description: z.string().trim().min(5, 'Açıklama en az 5 karakter olmalıdır').max(10000),
    shortDesc: z.string().trim().max(300).optional(),
    categoryId: z.string().uuid('Geçersiz kategori ID'),
    imageUrl: imagePath,
    bannerUrl: imagePath.optional(),
    galleryUrls: z.array(imagePath).max(MAX_GALLERY_IMAGES).optional(),
    brand: z.string().trim().min(1, 'Marka adı gereklidir').max(80),
    region: regionField,
    deliveryType: z.enum(['INSTANT', 'MANUAL']).default('INSTANT'),
    deliveryDeadlineHours: z.number().int().min(1).max(168).default(24),
    deliveryInstructions: z.string().trim().max(2000).optional(),
    isFeatured: z.boolean().default(false),
    isPopular: z.boolean().default(false),
    variants: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(150),
          denomination: z.string().trim().min(1).max(80),
          price: z.number().positive().max(1_000_000),
          originalPrice: z.number().positive().max(1_000_000).optional(),
        })
      )
      .min(1, 'En az bir varyant / paket eklenmelidir')
      .max(50),
  }),
});

export const createListingSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(3, 'İlan başlığı en az 3 karakter olmalıdır').max(150),
      description: z.string().trim().min(5, 'İlan açıklaması en az 5 karakter olmalıdır').max(10000),
      categoryId: z.string().uuid('Geçerli bir kategori seçiniz'),
      price: z.number().positive('Fiyat 0 dan büyük olmalıdır').max(1_000_000),
      originalPrice: z.number().positive().max(1_000_000).optional(),
      brand: z.string().trim().max(80).optional(),
      region: regionField,
      imageUrl: imagePath.optional(),
      galleryUrls: z.array(imagePath).max(MAX_GALLERY_IMAGES).optional(),
      deliveryType: z.enum(['INSTANT', 'MANUAL']).default('INSTANT'),
      deliveryDeadlineHours: z.number().int().min(1).max(168).default(24),
      deliveryInstructions: z.string().trim().max(2000).optional(),
      stockCount: z.number().int().min(1).max(10000).default(1),
      codes: codes.optional(),
    })
    .superRefine((data, ctx) => {
      if (data.deliveryType === 'INSTANT' && (!data.codes || data.codes.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Anında teslimatlı ürünlerde en az 1 adet dijital kod girmelisiniz',
          path: ['codes'],
        });
      }
      if (data.originalPrice !== undefined && data.originalPrice <= data.price) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Liste fiyatı satış fiyatından yüksek olmalıdır',
          path: ['originalPrice'],
        });
      }
    }),
});

export const updateListingSchema = z.object({
  params: idParams,
  body: z
    .object({
      title: z.string().trim().min(3, 'İlan başlığı en az 3 karakter olmalıdır').max(150),
      description: z.string().trim().min(5, 'İlan açıklaması en az 5 karakter olmalıdır').max(10000),
      categoryId: z.string().uuid('Geçerli bir kategori seçiniz'),
      price: z.number().positive('Fiyat 0 dan büyük olmalıdır').max(1_000_000),
      originalPrice: z.number().positive().max(1_000_000).nullable(),
      brand: z.string().trim().max(80),
      region: z.enum(REGIONS, { errorMap: () => ({ message: 'Geçerli bir bölge seçiniz' }) }),
      galleryUrls: z.array(imagePath).max(MAX_GALLERY_IMAGES),
      deliveryDeadlineHours: z.number().int().min(1).max(168).optional(),
      deliveryInstructions: z.string().trim().max(2000).nullable(),
    })
    .refine((d) => d.originalPrice === null || d.originalPrice > d.price, {
      message: 'Liste fiyatı satış fiyatından yüksek olmalıdır',
      path: ['originalPrice'],
    }),
});

export const addCodesSchema = z.object({
  params: idParams,
  body: z.object({
    codes: codes.min(1, 'En az 1 kod girmelisiniz'),
    variantId: z.string().uuid().optional(),
  }),
});

export const setStockSchema = z.object({
  params: idParams,
  body: z.object({ stockCount: z.number().int().min(0).max(10000) }),
});

export const setListedSchema = z.object({
  params: idParams,
  body: z.object({ isListed: z.boolean({ required_error: 'isListed alanı gereklidir' }) }),
});

export const productIdSchema = z.object({ params: idParams });

export const rejectProductSchema = z.object({
  params: idParams,
  body: z.object({ reason: z.string().trim().min(3, 'Red gerekçesi en az 3 karakter olmalıdır').max(500) }),
});
