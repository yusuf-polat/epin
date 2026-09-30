'use client';

import React, { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Category } from '@/features/categories/types';
import { REGIONS } from '../regions';

/**
 * Filtre durumu URL'de tutulur (paylaşılabilir, geri/ileri çalışır, SSR uyumlu).
 * Her değişiklik sunucuda yeniden sorgulanır.
 */
export default function CatalogFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(params.get('search') ?? '');
  const [minPrice, setMinPrice] = useState(params.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') ?? '');

  const activeCategory = params.get('cat') ?? '';
  const region = params.get('region') ?? '';
  const delivery = params.get('delivery') ?? '';
  const source = params.get('source') ?? '';

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const clear = () => {
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    startTransition(() => router.push(pathname, { scroll: false }));
  };

  const hasFilters = !!(activeCategory || region || delivery || source || params.get('search') || params.get('minPrice') || params.get('maxPrice'));
  const pill = (active: boolean) =>
    `py-1.5 rounded-lg font-bold border transition-colors ${
      active ? 'bg-[#2563eb] text-white border-blue-500' : 'bg-[#141622] text-[#94a3b8] hover:text-white border-[#222738]'
    }`;

  return (
    <aside className={`lg:col-span-3 lg:sticky top-24 bg-[#10121a] border border-[#1c1f2b] rounded-2xl p-5 shadow-xl flex flex-col gap-6 ${isPending ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between pb-3 border-b border-[#1c1f2b]">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <span className="material-symbols-outlined text-[#38bdf8] text-lg">tune</span>
          Filtreler
        </div>
        {hasFilters && (
          <button type="button" onClick={clear} className="text-[11px] font-bold text-[#38bdf8] hover:text-white underline">
            Sıfırla
          </button>
        )}
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">
          <span className="material-symbols-outlined text-sm text-[#38bdf8]">search</span>
          Kelime / Başlık Ara
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update({ search: search.trim() || null });
          }}
          className="relative"
        >
          <input
            type="search"
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Steam, Valorant, UC..."
            className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#38bdf8]"
          />
          <button type="submit" title="Ara" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-[#2563eb] text-white flex items-center justify-center hover:bg-[#1d4ed8]">
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </form>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2.5">
          <span className="material-symbols-outlined text-sm text-[#38bdf8]">category</span>
          Kategori
        </label>
        <div className="flex flex-wrap gap-2 max-h-[280px] overflow-y-auto pr-1">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.slug;
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => update({ cat: isSelected ? null : cat.slug })}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                  isSelected ? 'bg-[#2563eb] text-white border-blue-500' : 'bg-[#141622] text-[#94a3b8] hover:text-white hover:bg-[#1a1e2e] border-[#222738]'
                }`}
              >
                <span className="material-symbols-outlined text-xs">{isSelected ? 'check' : 'add'}</span>
                {cat.name}
                {!!cat._count?.products && (
                  <span className={`px-1.5 rounded-md text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-[#090a0f] text-[#64748b]'}`}>{cat._count.products}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">
          <span className="material-symbols-outlined text-sm text-[#38bdf8]">payments</span>
          Fiyat Aralığı (₺)
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update({ minPrice: minPrice || null, maxPrice: maxPrice || null });
          }}
          className="grid grid-cols-[1fr_1fr_auto] gap-2"
        >
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min"
            className="w-full px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#38bdf8]"
          />
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max"
            className="w-full px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#38bdf8]"
          />
          <button type="submit" className="px-3 rounded-xl bg-[#1c1f2b] hover:bg-[#23293a] text-white text-xs font-bold">
            Uygula
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-4 pt-2 border-t border-[#1c1f2b]">
        <div>
          <label className="text-[11px] font-bold text-[#64748b] block mb-1.5 uppercase tracking-wider">Teslimat</label>
          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            {[
              ['', 'Tümü'],
              ['INSTANT', 'Anında'],
              ['MANUAL', 'Satıcı'],
            ].map(([value, label]) => (
              <button key={label} type="button" onClick={() => update({ delivery: value || null })} className={pill(delivery === value)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold text-[#64748b] block mb-1.5 uppercase tracking-wider">Kaynak</label>
          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            {[
              ['', 'Tümü'],
              ['official', 'Resmi'],
              ['marketplace', 'Pazar'],
            ].map(([value, label]) => (
              <button key={label} type="button" onClick={() => update({ source: value || null })} className={pill(source === value)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="region-filter" className="text-[11px] font-bold text-[#64748b] block mb-1.5 uppercase tracking-wider">
            Hesap bölgem
          </label>
          <select
            id="region-filter"
            value={region}
            onChange={(e) => update({ region: e.target.value || null })}
            className="w-full px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs text-white focus:outline-none focus:border-[#38bdf8]"
          >
            <option value="">Tüm bölgeler</option>
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
          {region && region !== 'GLOBAL' && <p className="text-[10px] text-[#64748b] mt-1.5">Global kodlar da listelenir; bu bölgede çalışırlar.</p>}
        </div>
      </div>
    </aside>
  );
}
