import { z } from 'zod';
import { requiredText, splitLines } from '@/lib/validations/common';
import { DEFAULT_DELIVERY_HOURS, MAX_CODES_PER_REQUEST, MAX_DELIVERY_HOURS, MAX_GALLERY_IMAGES } from '../constants';
import { DEFAULT_REGION, REGION_CODES } from '../regions';

const regionField = z.enum(REGION_CODES, { errorMap: () => ({ message: 'Lütfen bir bölge seçiniz' }) });

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: requiredText(3, 'Değerlendirme', 1000),
});
export type ReviewValues = z.infer<typeof reviewSchema>;

export const rejectListingSchema = z.object({ reason: requiredText(3, 'Red gerekçesi', 500) });
export type RejectListingValues = z.infer<typeof rejectListingSchema>;

export const stockCountSchema = z.object({
  stockCount: z.coerce.number({ invalid_type_error: 'Stok sayı olmalıdır' }).int().min(0, 'Stok negatif olamaz').max(10000),
});

export const codesSchema = z.object({
  codesText: z
    .string()
    .refine((v) => splitLines(v).length > 0, 'En az 1 kod giriniz')
    .refine((v) => splitLines(v).length <= MAX_CODES_PER_REQUEST, `Tek seferde en fazla ${MAX_CODES_PER_REQUEST} kod eklenebilir`),
});

// ---------- İlan sihirbazı (adım adım doğrulanır) ----------
const moneyField = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} sayı olmalıdır` }).positive(`Geçerli bir ${label.toLowerCase()} giriniz`);

export const listingSchema = z
  .object({
    // Adım 1
    title: requiredText(3, 'İlan başlığı', 150),
    categoryId: z.string().min(1, 'Lütfen bir kategori seçiniz'),
    brand: z.string().trim().max(80),
    region: regionField,
    description: requiredText(5, 'Açıklama', 10000),
    // Adım 2
    price: moneyField('Satış fiyatı'),
    originalPrice: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().positive().optional()),
    images: z.array(z.string()).max(MAX_GALLERY_IMAGES),
    // Adım 3
    deliveryType: z.enum(['INSTANT', 'MANUAL']),
    deadlineHours: z.coerce.number().int().min(1, 'Teslim süresi en az 1 saat olmalıdır').max(MAX_DELIVERY_HOURS, `Teslim süresi en fazla ${MAX_DELIVERY_HOURS} saat olabilir`),
    stockCount: z.coerce.number().int().min(0).max(10000),
    codesText: z.string(),
    instructions: z.string().trim().max(2000),
  })
  .superRefine((v, ctx) => {
    if (v.originalPrice !== undefined && v.originalPrice <= v.price) {
      ctx.addIssue({ code: 'custom', path: ['originalPrice'], message: 'Liste fiyatı satış fiyatından yüksek olmalıdır' });
    }
    if (v.deliveryType === 'INSTANT') {
      const count = splitLines(v.codesText).length;
      if (count === 0) ctx.addIssue({ code: 'custom', path: ['codesText'], message: 'Anında teslimat için en az 1 kod girmelisiniz' });
      if (count > MAX_CODES_PER_REQUEST) ctx.addIssue({ code: 'custom', path: ['codesText'], message: `En fazla ${MAX_CODES_PER_REQUEST} kod girilebilir` });
    } else if (v.stockCount < 1) {
      ctx.addIssue({ code: 'custom', path: ['stockCount'], message: 'Stok adedi en az 1 olmalıdır' });
    }
  });

export type ListingFormInput = z.input<typeof listingSchema>;
export type ListingValues = z.output<typeof listingSchema>;

/** Her sihirbaz adımında tetiklenecek alanlar */
export const LISTING_STEP_FIELDS = {
  1: ['title', 'categoryId', 'brand', 'region', 'description'],
  2: ['price', 'originalPrice', 'images'],
  3: ['deliveryType', 'deadlineHours', 'stockCount', 'codesText', 'instructions'],
} as const satisfies Record<1 | 2 | 3, readonly (keyof ListingFormInput)[]>;

export const LISTING_DEFAULTS: ListingFormInput = {
  title: '',
  categoryId: '',
  brand: '',
  region: DEFAULT_REGION,
  description: '',
  price: '' as unknown as number,
  originalPrice: '',
  images: [],
  deliveryType: 'INSTANT',
  deadlineHours: DEFAULT_DELIVERY_HOURS,
  stockCount: 1,
  codesText: '',
  instructions: '',
};

// ---------- İlan düzenleme ----------
export const editListingSchema = z
  .object({
    title: requiredText(3, 'İlan başlığı', 150),
    categoryId: z.string().min(1, 'Lütfen bir kategori seçiniz'),
    brand: z.string().trim().max(80),
    region: regionField,
    description: requiredText(5, 'Açıklama', 10000),
    price: moneyField('Satış fiyatı'),
    originalPrice: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().positive().optional()),
    images: z.array(z.string()).max(MAX_GALLERY_IMAGES),
    deadlineHours: z.coerce.number().int().min(1).max(MAX_DELIVERY_HOURS, `Teslim süresi en fazla ${MAX_DELIVERY_HOURS} saat olabilir`),
    instructions: z.string().trim().max(2000),
  })
  .refine((v) => v.originalPrice === undefined || v.originalPrice > v.price, {
    message: 'Liste fiyatı satış fiyatından yüksek olmalıdır',
    path: ['originalPrice'],
  });

export type EditListingInput = z.input<typeof editListingSchema>;
export type EditListingValues = z.output<typeof editListingSchema>;

/** Düzenleme sihirbazında her adımda tetiklenecek alanlar */
export const EDIT_LISTING_STEP_FIELDS = {
  1: ['title', 'categoryId', 'brand', 'region', 'description'],
  2: ['price', 'originalPrice', 'images'],
  3: ['deadlineHours', 'instructions'],
} as const satisfies Record<1 | 2 | 3, readonly (keyof EditListingInput)[]>;
