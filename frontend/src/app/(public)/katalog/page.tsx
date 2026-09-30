import type { Metadata } from 'next';
import { categoryApi } from '@/features/categories/services/category.api';
import { productApi } from '@/features/products/services/product.api';
import CatalogView from '@/features/products/components/CatalogView';
import type { ProductFilters } from '@/features/products/types';
import { REGION_CODES } from '@/features/products/regions';

export const metadata: Metadata = {
  title: 'E-Pin Kataloğu | NexusPin',
  description: 'Steam, Valorant, PUBG UC ve daha fazlası: resmi ürünler ve doğrulanmış satıcı ilanları.',
};

type SearchParams = Record<string, string | undefined>;

const toNumber = (v?: string) => (v && !Number.isNaN(Number(v)) && Number(v) >= 0 ? Number(v) : undefined);

function toFilters(sp: SearchParams): ProductFilters {
  return {
    page: Math.max(1, toNumber(sp.page) ?? 1),
    limit: 24,
    category: sp.cat || undefined,
    search: sp.search?.slice(0, 100) || undefined,
    // Tanımsız bölge kodu (eski bağlantılar) filtresiz sayılır
    region: sp.region && (REGION_CODES as readonly string[]).includes(sp.region) ? sp.region : undefined,
    featured: sp.featured === 'true' ? true : undefined,
    delivery: sp.delivery === 'INSTANT' || sp.delivery === 'MANUAL' ? sp.delivery : undefined,
    isMarketplace: sp.source === 'marketplace' ? true : sp.source === 'official' ? false : undefined,
    minPrice: toNumber(sp.minPrice),
    maxPrice: toNumber(sp.maxPrice),
    sort: sp.sort === 'newest' ? 'newest' : 'popular',
  };
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = toFilters(searchParams);
  const [productsResult, categories] = await Promise.all([
    productApi.list(filters).catch(() => null),
    categoryApi.list().catch(() => []),
  ]);

  return (
    <CatalogView
      products={productsResult?.items ?? []}
      meta={productsResult?.meta ?? { page: 1, limit: 24, total: 0, totalPages: 1 }}
      categories={categories}
      searchParams={searchParams}
      error={!productsResult}
    />
  );
}
