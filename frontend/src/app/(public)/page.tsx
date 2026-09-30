import Link from 'next/link';
import HeroSlider from '@/features/home/components/HeroSlider';
import CategorySlider from '@/features/categories/components/CategorySlider';
import ProductCard from '@/features/products/components/ProductCard';
import { categoryApi } from '@/features/categories/services/category.api';
import { productApi } from '@/features/products/services/product.api';

// Vitrin verisi her istekte değil, kısa aralıklarla yenilenir
export const revalidate = 60;

const FEATURED_COUNT = 5;

export default async function HomePage() {
  const [productsResult, featuredResult, categories] = await Promise.all([
    productApi.list({ limit: 12 }, { next: { revalidate: 60 } }).catch(() => null),
    productApi.list({ featured: true, limit: FEATURED_COUNT }, { next: { revalidate: 60 } }).catch(() => null),
    categoryApi.list({ next: { revalidate: 300 } }).catch(() => []),
  ]);
  const products = productsResult?.items ?? [];
  // Yönetimin öne çıkardığı ürünler; yetmezse vitrindeki ilanlarla tamamlanır
  const picked = featuredResult?.items ?? [];
  const featured = [...picked, ...products.filter((p) => !picked.some((f) => f.id === p.id))].slice(0, FEATURED_COUNT);

  return (
    <div className="flex flex-col w-full">
      <HeroSlider featured={featured} />
      <CategorySlider categories={categories} />

      <section className="w-full py-12 lg:py-16 bg-[#090a0f]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display font-bold text-2xl text-white">Yeni ve popüler ilanlar</h2>
              <p className="text-sm text-[#94a3b8] mt-1">Onaylı satıcıların vitrindeki ilanları</p>
            </div>
            <Link href="/katalog" className="text-sm font-semibold text-[#7dd3fc] hover:underline underline-offset-4">
              Tümünü gör
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="bg-[#10121a] border border-[#1c1f2b] rounded-2xl p-10 text-center text-xs text-[#64748b]">
              {productsResult ? 'Henüz yayında ürün bulunmuyor.' : 'Ürünler şu anda yüklenemedi.'}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
