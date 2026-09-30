import Link from 'next/link';
import { formatTRY } from '@/lib/utils/format';
import type { Product } from '@/features/products/types';
import { regionShort } from '@/features/products/regions';

const lowestPrice = (p: Product) => (p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : 0);

/** Ana sayfada slaytın yanında dikey öne çıkan ürünler listesi */
export default function FeaturedRail({ products }: { products: Product[] }) {
  return (
    <aside aria-labelledby="featured-rail-title" className="h-full rounded-2xl bg-[#10121a] border border-[#1c1f2b] flex flex-col overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-baseline justify-between">
        <h2 id="featured-rail-title" className="font-display font-bold text-base text-white">
          Öne çıkanlar
        </h2>
        <Link href="/katalog?featured=true" className="text-xs font-semibold text-[#7dd3fc] hover:underline underline-offset-4">
          Tümü
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="px-5 pb-5 text-xs text-[#64748b]">Henüz öne çıkan ürün yok.</p>
      ) : (
        <ol className="flex-1 flex flex-col divide-y divide-[#1c1f2b]">
          {products.map((p) => {
            const outOfStock = p.totalStock <= 0;
            return (
              <li key={p.id} className="flex-1">
                <Link href={`/urun/${p.slug}`} className="h-full px-5 py-3 flex items-center gap-3 hover:bg-white/[0.03] transition-colors group">
                  <img src={p.imageUrl} alt="" loading="lazy" className="w-14 h-14 rounded-lg object-cover border border-[#23293a] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white truncate group-hover:text-[#7dd3fc]">{p.title}</div>
                    <div className="text-[11px] text-[#64748b] truncate mt-0.5">
                      {p.category?.name ?? p.brand} · {regionShort(p.region)} · {p.deliveryType === 'MANUAL' ? `${p.deliveryDeadlineHours} sa teslim` : 'Anında'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-bold text-sm text-white tabular-nums">{formatTRY(lowestPrice(p))}</div>
                    {outOfStock ? (
                      <div className="text-[10px] text-rose-300">Stokta yok</div>
                    ) : p.avgRating ? (
                      <div className="text-[10px] text-[#94a3b8]">★ {p.avgRating.toFixed(1)}</div>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
