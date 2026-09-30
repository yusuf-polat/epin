/**
 * İlan düzenleme kuralları (saf fonksiyonlar, unit test edilir).
 * Alıcıyı yanıltabilecek içerik değişiklikleri yeniden onay gerektirir;
 * yalnızca fiyat/teslim süresi gibi ticari alanlar anında yayına yansır.
 */
export interface ListingContent {
  title: string;
  description: string;
  categoryId: string;
  brand: string;
  region: string;
  imageUrl: string;
  galleryUrls: string[];
  deliveryInstructions: string | null;
}

const CONTENT_FIELDS: (keyof ListingContent)[] = [
  'title',
  'description',
  'categoryId',
  'brand',
  'region',
  'imageUrl',
  'galleryUrls',
  'deliveryInstructions',
];

const same = (a: unknown, b: unknown) => (Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((v, i) => v === b[i]) : (a ?? null) === (b ?? null));

/** Değişen içerik alanlarının listesi */
export function changedContentFields(before: ListingContent, after: ListingContent): (keyof ListingContent)[] {
  return CONTENT_FIELDS.filter((f) => !same(before[f], after[f]));
}

export const needsReapproval = (before: ListingContent, after: ListingContent) => changedContentFields(before, after).length > 0;
