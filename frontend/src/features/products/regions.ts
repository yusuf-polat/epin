/** Kodun etkinleştirilebileceği bölgeler (backend product.constants REGIONS ile aynı kodlar) */
export const REGIONS = [
  { code: 'GLOBAL', label: 'Global', short: 'Global', hint: 'Tüm bölgelerdeki hesaplarda çalışır' },
  { code: 'TR', label: 'Türkiye', short: 'TR', hint: 'Yalnızca Türkiye bölgesi hesaplarda çalışır' },
  { code: 'EU', label: 'Avrupa', short: 'EU', hint: 'Avrupa Birliği bölgesi hesaplarda çalışır' },
  { code: 'EMEA', label: 'Avrupa, Orta Doğu ve Afrika', short: 'EMEA', hint: 'EMEA bölgesi hesaplarda (Türkiye dahil olabilir, ilan açıklamasını kontrol edin)' },
  { code: 'UK', label: 'Birleşik Krallık', short: 'UK', hint: 'Birleşik Krallık hesaplarında çalışır' },
  { code: 'US', label: 'ABD', short: 'US', hint: 'Amerika Birleşik Devletleri hesaplarında çalışır' },
  { code: 'LATAM', label: 'Latin Amerika', short: 'LATAM', hint: 'Latin Amerika bölgesi hesaplarda çalışır' },
  { code: 'ASIA', label: 'Asya', short: 'Asya', hint: 'Asya bölgesi hesaplarda çalışır' },
  { code: 'RU_CIS', label: 'Rusya ve BDT', short: 'RU/CIS', hint: 'Rusya ve BDT ülkeleri hesaplarında çalışır' },
] as const;

export type RegionCode = (typeof REGIONS)[number]['code'];
export const REGION_CODES = REGIONS.map((r) => r.code) as [RegionCode, ...RegionCode[]];
export const DEFAULT_REGION: RegionCode = 'GLOBAL';

const byCode = new Map<string, (typeof REGIONS)[number]>(REGIONS.map((r) => [r.code, r]));

/** Bilinmeyen (eski) değerlerde metnin kendisi gösterilir */
export const regionLabel = (code: string | null | undefined) => (code ? byCode.get(code)?.label ?? code : 'Global');
export const regionShort = (code: string | null | undefined) => (code ? byCode.get(code)?.short ?? code : 'Global');
export const regionHint = (code: string | null | undefined) => (code ? byCode.get(code)?.hint ?? null : null);
export const isGlobalRegion = (code: string | null | undefined) => !code || code === 'GLOBAL';
