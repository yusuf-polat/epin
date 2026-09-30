import Link from 'next/link';
import type { PaginationMeta } from '@/lib/api';
import { LinkPagination } from '@/components/shared/LinkPagination';
import { Store } from '../types';

export default function StoresDirectory({ stores, meta, search }: { stores: Store[]; meta: PaginationMeta; search?: string }) {
  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#64748b] mb-6">
        <Link href="/" className="hover:text-[#38bdf8]">Ana Sayfa</Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-white font-bold">Mağazalar</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#1c1f2b] mb-8">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white">Satıcı Mağazaları</h1>
          <p className="text-xs sm:text-sm text-[#94a3b8] mt-1.5">Onaylı satıcıların mağazaları · {meta.total} mağaza</p>
        </div>
        {/* GET formu: arama URL'de tutulur */}
        <form action="/magazalar" className="relative w-full md:w-80">
          <input
            type="search"
            name="search"
            defaultValue={search}
            maxLength={100}
            placeholder="Mağaza ara..."
            className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-[#10121a] border border-[#1c1f2b] text-xs text-white focus:outline-none focus:border-[#38bdf8]"
          />
          <button type="submit" aria-label="Ara" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-[#2563eb] text-white flex items-center justify-center">
            <span className="material-symbols-outlined text-sm">search</span>
          </button>
        </form>
      </div>

      {stores.length === 0 ? (
        <div className="bg-[#10121a] rounded-2xl p-12 text-center border border-[#1c1f2b] text-xs text-[#94a3b8]">
          {search ? 'Aramanızla eşleşen mağaza bulunamadı.' : 'Henüz aktif mağaza bulunmuyor.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((s) => (
            <Link
              key={s.id}
              href={`/magaza/${s.slug}`}
              className="group bg-[#10121a] rounded-2xl border border-[#1c1f2b] hover:border-[#38bdf8]/50 overflow-hidden transition-all hover:-translate-y-0.5"
            >
              <div className="relative h-28">
                <img src={s.coverUrl} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#10121a] to-transparent" />
              </div>
              <div className="px-5 pb-5 -mt-8 relative flex flex-col gap-3">
                <img src={s.logoUrl} alt={s.name} loading="lazy" className="w-16 h-16 rounded-xl object-cover border-4 border-[#10121a]" />
                <div>
                  <h2 className="font-display font-extrabold text-base text-white group-hover:text-[#38bdf8]">{s.name}</h2>
                  {s.description && <p className="text-xs text-[#94a3b8] line-clamp-2 mt-1">{s.description}</p>}
                </div>
                <div className="grid grid-cols-3 text-center text-[11px] bg-[#090a0f] border border-[#1c1f2b] rounded-xl p-2 divide-x divide-[#1c1f2b]">
                  <div>
                    <div className="text-[#64748b]">Satış</div>
                    <div className="font-bold text-white">{s.stats?.totalSales ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-[#64748b]">İlan</div>
                    <div className="font-bold text-white">{s.stats?.activeListings ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-[#64748b]">Puan</div>
                    <div className="font-bold text-amber-400">{s.stats?.avgRating != null ? s.stats.avgRating.toFixed(1) : '—'}</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <LinkPagination page={meta.page} totalPages={meta.totalPages} basePath="/magazalar" searchParams={{ search }} />
    </div>
  );
}
