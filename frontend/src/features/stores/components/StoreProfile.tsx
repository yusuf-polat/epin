import Link from 'next/link';
import ReportButton from '@/features/complaints/components/ReportButton';
import type { PaginationMeta } from '@/lib/api';
import { formatDate } from '@/lib/utils/format';
import { LinkPagination } from '@/components/shared/LinkPagination';
import ProductCard from '@/features/products/components/ProductCard';
import type { Product } from '@/features/products/types';
import { Store } from '../types';

export default function StoreProfile({ store, products, meta }: { store: Store; products: Product[]; meta: PaginationMeta }) {
  const stats = store.stats;
  const metrics = [
    { label: 'Satılan Kod', value: stats?.totalSales ?? 0, icon: 'check_circle', color: 'text-emerald-400' },
    { label: 'Aktif İlan', value: stats?.activeListings ?? 0, icon: 'inventory_2', color: 'text-[#38bdf8]' },
    {
      label: 'Mağaza Puanı',
      value: stats?.avgRating != null ? `${stats.avgRating.toFixed(1)} (${stats.reviewCount})` : 'Yeni',
      icon: 'star',
      color: 'text-amber-400',
    },
    { label: 'Üyelik', value: formatDate(stats?.memberSince ?? store.owner.createdAt), icon: 'calendar_month', color: 'text-purple-400' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#64748b]">
        <Link href="/" className="hover:text-[#38bdf8]">Ana Sayfa</Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <Link href="/magazalar" className="hover:text-[#38bdf8]">Mağazalar</Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-white font-bold">{store.name}</span>
      </div>

      <div className="relative rounded-3xl overflow-hidden border border-[#1c1f2b] bg-[#10121a]">
        <div className="relative h-40 sm:h-56">
          <img src={store.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#10121a] via-[#10121a]/40 to-transparent" />
        </div>
        <div className="relative px-6 pb-6 -mt-12 flex flex-col sm:flex-row sm:items-end gap-4">
          <img src={store.logoUrl} alt={store.name} className="w-24 h-24 rounded-2xl object-cover border-4 border-[#10121a] shadow-xl" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white">{store.name}</h1>
            {store.description && <p className="text-xs text-[#94a3b8] mt-1 max-w-2xl whitespace-pre-line">{store.description}</p>}
          </div>
          <Link
            href={`/hesabim/mesajlar?target=${store.owner.id}`}
            className="px-4 py-2.5 rounded-xl bg-[#161824] border border-[#222534] text-[#38bdf8] text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-sm">chat</span>
            Satıcıya Mesaj
          </Link>
          <div className="self-start sm:self-auto">
            <ReportButton targetType="STORE" targetId={store.id} ownerId={store.owner.id} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-[#10121a] p-5 rounded-2xl border border-[#1c1f2b] flex items-center gap-3">
            <span className={`material-symbols-outlined text-2xl ${m.color}`}>{m.icon}</span>
            <div>
              <div className="text-[11px] text-[#64748b] font-semibold">{m.label}</div>
              <div className="font-display font-black text-base text-white">{m.value}</div>
            </div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="font-display font-extrabold text-xl text-white mb-4">İlanlar ({meta.total})</h2>
        {products.length === 0 ? (
          <div className="bg-[#10121a] border border-[#1c1f2b] rounded-2xl p-10 text-center text-xs text-[#64748b]">Bu mağazanın yayında ilanı bulunmuyor.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            <LinkPagination page={meta.page} totalPages={meta.totalPages} basePath={`/magaza/${store.slug}`} searchParams={{ page: String(meta.page) }} />
          </>
        )}
      </section>
    </div>
  );
}
