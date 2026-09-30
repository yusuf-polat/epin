import { formatTRY } from '@/lib/utils/format';
import { regionLabel } from './regions';
import type { EditListingValues } from './schemas/product.schema';
import type { EditableListing } from './types';

export interface ListingChange {
  label: string;
  before: string;
  after: string;
  /** İçerik alanı değiştiyse ilan yeniden onaya düşer (backend product.rules ile aynı kural) */
  reapproval: boolean;
}

const text = (v: string | null | undefined) => (v ?? '').trim();
const money = (v: number | null | undefined) => (v == null ? '—' : formatTRY(v));
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** Düzenleme formundaki değerleri mevcut ilanla karşılaştırır */
export function listingChanges(listing: EditableListing, v: EditListingValues, categoryName: (id: string) => string): ListingChange[] {
  const changes: ListingChange[] = [];
  const add = (label: string, before: string, after: string, reapproval: boolean) => {
    if (before !== after) changes.push({ label, before: before || '—', after: after || '—', reapproval });
  };

  add('Başlık', text(listing.title), text(v.title), true);
  add('Kategori', categoryName(listing.categoryId), categoryName(v.categoryId), true);
  // Boş marka gönderilirse backend mevcut markayı korur
  add('Marka', text(listing.brand), text(v.brand) || text(listing.brand), true);
  add('Bölge', regionLabel(listing.region), regionLabel(v.region), true);
  add('Açıklama', text(listing.description), text(v.description), true);
  add('Satış fiyatı', money(listing.price), money(v.price), false);
  add('Liste fiyatı', money(listing.originalPrice), money(v.originalPrice ?? null), false);
  if (!sameList(listing.galleryUrls, v.images)) {
    changes.push({ label: 'Görseller', before: `${listing.galleryUrls.length} görsel`, after: `${v.images.length} görsel`, reapproval: true });
  }
  if (listing.deliveryType === 'MANUAL') add('Teslim süresi', `${listing.deliveryDeadlineHours} saat`, `${v.deadlineHours} saat`, false);
  add('Teslimat bilgisi', text(listing.deliveryInstructions), text(v.instructions), true);
  return changes;
}
