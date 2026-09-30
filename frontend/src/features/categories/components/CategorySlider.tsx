'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { Category } from '../types';

const FALLBACK_IMAGE = '/30_sprite_yeni/01_oyunlar.png';

export default function CategorySlider({ categories }: { categories: Category[] }) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    const el = sliderRef.current;
    if (!el) return;
    el.scrollBy({ left: (direction === 'left' ? -1 : 1) * el.clientWidth * 0.75, behavior: 'smooth' });
  };

  if (categories.length === 0) return null;

  return (
    <section className="w-full pt-10 pb-4 bg-[#090a0f]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 className="font-display font-bold text-2xl text-white">Kategoriler</h2>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/katalog" className="hidden sm:inline text-sm font-semibold text-[#7dd3fc] hover:underline underline-offset-4 mr-2">
              Tümünü gör
            </Link>
            {(['left', 'right'] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => scroll(dir)}
                aria-label={dir === 'left' ? 'Önceki Kategoriler' : 'Sonraki Kategoriler'}
                className="w-9 h-9 rounded-xl bg-[#10121a] hover:bg-[#161924] border border-[#1e2230] hover:border-[#38bdf8]/50 text-[#94a3b8] hover:text-white flex items-center justify-center transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-xl">{dir === 'left' ? 'chevron_left' : 'chevron_right'}</span>
              </button>
            ))}
          </div>
        </div>

        <div
          ref={sliderRef}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((cat, idx) => (
            <Link
              key={cat.slug}
              href={`/katalog?cat=${cat.slug}`}
              aria-label={cat.name}
              title={cat.name}
              className="group shrink-0 w-[190px] sm:w-[220px] md:w-[235px] aspect-[16/10] rounded-xl bg-[#10121a] border border-[#1b1e2a] hover:border-[#334155] transition-colors overflow-hidden flex items-center justify-center p-2.5 select-none"
            >
              <img
                src={cat.imageUrl || FALLBACK_IMAGE}
                alt={cat.name}
                loading={idx < 6 ? 'eager' : 'lazy'}
                className="w-full h-full object-contain p-1"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
