import Link from 'next/link';
import { LinkPagination } from '@/components/shared/LinkPagination';
import type { Category } from '@/features/categories/types';
import type { PaginationMeta } from '@/lib/api';
import { Product } from '../types';
import CatalogFilters from './CatalogFilters';
import CatalogToolbar from './CatalogToolbar';
import ProductCard from './ProductCard';

interface CatalogViewProps {
  products: Product[];
  meta: PaginationMeta;
  categories: Category[];
  searchParams: Record<string, string | undefined>;
  error?: boolean;
}

export default function CatalogView({ products, meta, categories, searchParams, error }: CatalogViewProps) {
  const view = searchParams.view === 'list' ? 'list' : 'grid';
  const activeCategory = categories.find((c) => c.slug === searchParams.cat);

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#64748b] mb-6">
        <Link href="/" className="hover:text-[#38bdf8] transition-colors">Ana Sayfa</Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-white font-bold">{activeCategory?.name ?? 'E-Pin & Dijital Ürün Kataloğu'}</span>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-[#1c1f2b] mb-8">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            {activeCategory?.name ?? 'E-Pin & Dijital Ürünler'}
          </h1>
          <p className="text-xs sm:text-sm text-[#94a3b8] mt-1.5 max-w-2xl leading-relaxed">
            {activeCategory?.description ?? 'Resmi ürünler ve doğrulanmış satıcıların ilanları, escrow güvencesiyle.'}
          </p>
        </div>
        <CatalogToolbar total={meta.total} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <CatalogFilters categories={categories} />

        <main className="lg:col-span-9">
          {error ? (
            <div className="bg-rose-950/30 rounded-2xl p-10 text-center border border-rose-900/50 text-xs text-rose-200">
              Ürünler şu anda yüklenemedi. Lütfen daha sonra tekrar deneyiniz.
            </div>
          ) : products.length > 0 ? (
            <>
              <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'flex flex-col gap-4'}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} viewMode={view} />
                ))}
              </div>
              <LinkPagination page={meta.page} totalPages={meta.totalPages} basePath="/katalog" searchParams={searchParams} />
            </>
          ) : (
            <div className="bg-[#10121a] rounded-2xl p-12 text-center border border-[#1c1f2b] flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-[#161824] flex items-center justify-center text-[#38bdf8]">
                <span className="material-symbols-outlined text-3xl">filter_alt_off</span>
              </div>
              <h3 className="font-display font-bold text-lg text-white">Aradığınız Kriterlerde Ürün Bulunamadı</h3>
              <p className="text-xs text-[#94a3b8] max-w-sm">Filtreleri genişleterek veya arama terimini değiştirerek tekrar deneyebilirsiniz.</p>
              <Link href="/katalog" className="mt-2 px-5 py-2.5 rounded-xl bg-[#2563eb] text-white text-xs font-bold hover:bg-[#1d4ed8]">
                Tüm Filtreleri Temizle
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
