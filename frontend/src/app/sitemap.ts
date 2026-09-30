import type { MetadataRoute } from 'next';
import { apiClient } from '@/lib/api';
import { siteConfig } from '@/config/site';
import { LEGAL_DOCUMENTS } from '@/features/legal/constants';

// Ürünler sık değiştiği için saatte bir yeniden oluşturulur
export const revalidate = 3600;

const PAGE_SIZE = 100;
/** Çok büyük kataloglarda sitemap'i sınırlı tutar (Google limiti: 50.000 adres) */
const MAX_PAGES = 50;

interface Slugged {
  slug: string;
  updatedAt?: string;
  createdAt?: string;
}

async function collect(path: string): Promise<Slugged[]> {
  const items: Slugged[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const res = await apiClient.getPage<Slugged>(path, { params: { page, limit: PAGE_SIZE } });
      items.push(...res.items);
      if (page >= res.meta.totalPages) break;
    } catch {
      break;
    }
  }
  return items;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const [products, stores, categories] = await Promise.all([
    collect('/products'),
    collect('/stores'),
    apiClient.get<Slugged[]>('/categories').catch(() => [] as Slugged[]),
  ]);
  const at = (item: Slugged) => new Date(item.updatedAt ?? item.createdAt ?? Date.now());

  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/katalog`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/magazalar`, changeFrequency: 'daily', priority: 0.7 },
    ...['/sss', '/hakkimizda', '/iletisim'].map((p) => ({ url: `${base}${p}`, changeFrequency: 'monthly' as const, priority: 0.4 })),
    ...LEGAL_DOCUMENTS.map((d) => ({ url: `${base}/sozlesmeler/${d.slug}`, changeFrequency: 'yearly' as const, priority: 0.2 })),
    ...categories.map((c) => ({ url: `${base}/katalog?cat=${encodeURIComponent(c.slug)}`, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${base}/urun/${p.slug}`, lastModified: at(p), changeFrequency: 'daily' as const, priority: 0.8 })),
    ...stores.map((s) => ({ url: `${base}/magaza/${s.slug}`, lastModified: at(s), changeFrequency: 'weekly' as const, priority: 0.6 })),
  ];
}
