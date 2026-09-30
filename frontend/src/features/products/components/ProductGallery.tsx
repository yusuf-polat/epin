'use client';

import React, { useState } from 'react';
import { regionLabel } from '../regions';

interface ProductGalleryProps {
  imageUrl: string;
  galleryUrls?: string[];
  title: string;
  brand: string;
  region: string;
  deliveryLabel: string;
}

export default function ProductGallery({ imageUrl, galleryUrls = [], title, brand, region, deliveryLabel }: ProductGalleryProps) {
  const images = Array.from(new Set([imageUrl, ...galleryUrls].filter(Boolean)));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const currentImage = images[selectedIndex] || imageUrl;

  const prev = () => setSelectedIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setSelectedIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="flex flex-col gap-3">
      <div className="group relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#10121a] border border-[#1c1f2b] shadow-xl">
        <img
          src={currentImage}
          alt={`${title} - Görsel ${selectedIndex + 1}`}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-black/25 to-transparent pointer-events-none" />

        <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
          <span className="px-3 py-1 rounded-lg bg-[#090a0f]/80 border border-white/10 backdrop-blur-md text-xs font-bold text-white uppercase tracking-wider">
            {brand}
          </span>
          <span className="px-3 py-1 rounded-lg bg-[#090a0f]/80 border border-white/10 backdrop-blur-md text-xs font-bold text-white">{regionLabel(region)}</span>
        </div>

        {images.length > 1 && (
          <>
            <div className="absolute top-4 right-4 z-10">
              <span className="px-2.5 py-1 rounded-lg bg-[#090a0f]/80 border border-white/15 backdrop-blur-md text-[11px] font-mono font-bold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs text-[#38bdf8]">photo_library</span>
                {selectedIndex + 1} / {images.length}
              </span>
            </div>
            <button
              type="button"
              onClick={prev}
              aria-label="Önceki Görsel"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-[#090a0f]/80 hover:bg-[#2563eb] border border-white/15 text-white flex items-center justify-center backdrop-blur-md transition-all z-10"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Sonraki Görsel"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-[#090a0f]/80 hover:bg-[#2563eb] border border-white/15 text-white flex items-center justify-center backdrop-blur-md transition-all z-10"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </>
        )}

        <div className="absolute bottom-4 left-4 right-4 text-white z-10">
          <h1 className="font-display font-extrabold text-xl sm:text-2xl text-white drop-shadow-md">{title}</h1>
          <div className="flex items-center gap-2 text-xs font-medium text-[#94a3b8] mt-1 drop-shadow">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span>{deliveryLabel}</span>
          </div>
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={`${img}-${idx}`}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden border transition-all shrink-0 ${
                idx === selectedIndex ? 'border-[#38bdf8] ring-2 ring-[#38bdf8]/40' : 'border-[#1e2230] opacity-60 hover:opacity-90'
              }`}
            >
              <img src={img} alt={`${title} küçük görsel ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
