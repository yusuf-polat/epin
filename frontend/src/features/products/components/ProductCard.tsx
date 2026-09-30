import Link from 'next/link';
import { formatTRY } from '@/lib/utils/format';
import { Product } from '../types';
import { regionLabel, regionShort } from '../regions';

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
}

function priceInfo(product: Product) {
  const prices = product.variants.map((v) => v.price);
  const lowest = prices.length ? Math.min(...prices) : 0;
  const original = product.variants.find((v) => v.originalPrice && v.originalPrice > v.price && v.price === lowest)?.originalPrice ?? null;
  const discount = original && original > lowest ? Math.round(((original - lowest) / original) * 100) : null;
  return { lowest, original, discount };
}

export default function ProductCard({ product, viewMode = 'grid' }: ProductCardProps) {
  const { lowest, original, discount } = priceInfo(product);
  const isOutOfStock = product.totalStock <= 0;
  const isManual = product.deliveryType === 'MANUAL';
  const deliveryText = isManual ? `${product.deliveryDeadlineHours} saat` : 'Anında';
  const sellerName = product.seller?.store?.name ?? (product.sellerId ? product.seller?.name : 'NexusPin');
  const href = `/urun/${product.slug}`;

  if (viewMode === 'list') {
    return (
      <div className="group flex flex-col sm:flex-row bg-[#10121a] rounded-2xl border border-[#1c1f2b] hover:border-[#38bdf8]/50 overflow-hidden shadow-md transition-all duration-200">
        <Link href={href} className="relative w-full sm:w-64 h-48 sm:h-auto shrink-0 overflow-hidden bg-[#090a0f] block">
          <img src={product.imageUrl} alt={product.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white">{product.brand}</span>
          </div>
        </Link>

        <div className="p-5 flex-1 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-wider block mb-1">{product.category?.name || 'Dijital Ürün'}</span>
                <Link href={href}>
                  <h3 className="font-display font-extrabold text-base text-white group-hover:text-[#38bdf8] transition-colors">{product.title}</h3>
                </Link>
              </div>
              <span className="font-display font-black text-2xl text-white shrink-0">{formatTRY(lowest)}</span>
            </div>
            <p className="text-xs text-[#94a3b8] line-clamp-2 mt-2 leading-relaxed">{product.shortDesc || product.description}</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[#1c1f2b]">
            <div className="flex items-center gap-4 text-xs text-[#94a3b8]">
              <span>Bölge: <strong className="text-white">{regionLabel(product.region)}</strong></span>
              <span>•</span>
              <span>Teslimat: <strong className="text-emerald-400">{deliveryText}</strong></span>
            </div>
            <Link
              href={href}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all shadow-md shrink-0"
            >
              {isOutOfStock ? 'Detayları Gör' : 'Paketleri Gör & Satın Al'}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col bg-[#10121a] rounded-2xl border border-[#1c1f2b] hover:border-[#38bdf8]/50 overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300">
      <Link href={href} className="relative aspect-[16/11] w-full overflow-hidden bg-[#090a0f] block">
        <img src={product.imageUrl} alt={product.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#10121a] via-transparent to-black/30 opacity-70" />

        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
          {discount && discount > 0 && <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-black shadow-lg">-%{discount}</span>}
          <span className="px-3 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 text-[11px] font-bold text-white">{product.brand}</span>
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex items-center justify-center z-20">
            <span className="px-4 py-2 rounded-xl bg-red-600/90 text-white text-xs font-black uppercase tracking-wider border border-red-500 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">block</span>
              Stokta Yok
            </span>
          </div>
        )}

        <div className="absolute bottom-3 left-3 z-10">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/15 text-[11px] font-bold text-emerald-400 font-mono">
            {isManual && <span className="material-symbols-outlined text-xs">schedule</span>}
            {deliveryText}
          </span>
        </div>
        <div className="absolute bottom-3 right-3 z-10">
          <span className="px-2.5 py-0.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/15 text-[11px] font-bold text-white">{regionShort(product.region)}</span>
        </div>
      </Link>

      <div className="p-5 flex flex-col justify-between flex-1 gap-3">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-black text-xl text-white tracking-tight">{formatTRY(lowest)}</span>
              {original && original > lowest && <span className="text-xs text-[#64748b] line-through">{formatTRY(original)}</span>}
            </div>
            <span className="px-2.5 py-0.5 rounded-lg bg-[#161924] border border-[#23283a] text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider truncate max-w-[45%]">
              {product.category?.name || 'Dijital Ürün'}
            </span>
          </div>

          <Link href={href}>
            <h3 className="font-display font-extrabold text-sm text-white group-hover:text-[#38bdf8] transition-colors line-clamp-1 leading-snug">{product.title}</h3>
          </Link>

          <div className="flex items-center justify-between gap-2 mt-1.5 text-xs">
            <div className="flex items-center gap-1 text-[#64748b] truncate">
              <span className="material-symbols-outlined text-xs text-[#38bdf8]">storefront</span>
              <span className="truncate">{sellerName}</span>
            </div>
            {product.avgRating !== null && (
              <div className="flex items-center gap-1 shrink-0 bg-[#161924] px-2 py-0.5 rounded-md border border-[#23283a]">
                <span className="material-symbols-outlined text-xs text-amber-400">star</span>
                <span className="text-[11px] font-bold text-white">{product.avgRating.toFixed(1)}</span>
                <span className="text-[10px] text-[#64748b]">({product.reviewCount})</span>
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-[#1c1f2b] flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#94a3b8] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs text-emerald-400">shield</span>
            Escrow Korumalı
          </span>
          {isOutOfStock ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Stokta Yok
            </span>
          ) : (
            <Link href={href} className="inline-flex items-center gap-1 text-xs font-bold text-[#38bdf8] hover:text-white transition-all">
              İncele
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
