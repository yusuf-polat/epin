/** Vitrin listesi önbellek süresi (sn) */
export const LIST_CACHE_TTL = 120;

/** Ürün detayı önbellek süresi (sn) */
export const DETAIL_CACHE_TTL = 60;

/** Tek istekte eklenebilecek azami dijital kod */
export const MAX_CODES_PER_REQUEST = 1000;

/** İlan başına azami galeri görseli */
export const MAX_GALLERY_IMAGES = 10;

/** Kodun etkinleştirilebileceği bölgeler (frontend features/products/regions.ts ile aynı) */
export const REGIONS = ['GLOBAL', 'TR', 'EU', 'EMEA', 'UK', 'US', 'LATAM', 'ASIA', 'RU_CIS'] as const;
export type Region = (typeof REGIONS)[number];
export const DEFAULT_REGION: Region = 'GLOBAL';
