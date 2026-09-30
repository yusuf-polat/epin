'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function CatalogToolbar({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const sort = params.get('sort') ?? 'popular';
  const view = params.get('view') ?? 'grid';

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    if (key === 'sort') next.delete('page');
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">{total} ürün</span>
      <div className="relative">
        <select
          value={sort}
          onChange={(e) => set('sort', e.target.value)}
          aria-label="Sıralama"
          className="appearance-none bg-[#10121a] text-xs font-bold text-white border border-[#1c1f2b] px-4 py-2.5 pr-8 rounded-xl focus:outline-none focus:border-[#38bdf8] cursor-pointer"
        >
          <option value="popular">Sıralama: Öne Çıkanlar</option>
          <option value="newest">Sıralama: En Yeni</option>
        </select>
        <span className="material-symbols-outlined text-sm text-[#64748b] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
      </div>
      <div className="flex items-center bg-[#10121a] p-1 rounded-xl border border-[#1c1f2b]">
        {[
          ['grid', 'grid_view', 'Izgara'],
          ['list', 'view_list', 'Liste'],
        ].map(([value, icon, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => set('view', value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              view === value ? 'bg-[#1e2333] text-white' : 'text-[#64748b] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
