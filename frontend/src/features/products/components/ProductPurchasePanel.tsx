'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/lib/api';
import { formatTRY } from '@/lib/utils/format';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCart } from '@/features/cart/hooks/useCart';
import { Product, ProductVariant } from '../types';
import { isGlobalRegion, regionLabel } from '../regions';

function StoreCard({ product }: { product: Product }) {
  const store = product.store;
  const storeName = store?.name ?? (product.sellerId ? product.seller?.name ?? 'Satıcı' : 'NexusPin Resmi Mağazası');
  const stats = store?.stats;

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121520] via-[#10121a] to-[#0a0c12] border border-[#1e2334] flex flex-col gap-4 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#161a28] border border-[#262c3e] flex items-center justify-center shrink-0 shadow-md">
          {store?.logoUrl || product.seller?.avatarUrl ? (
            <img src={store?.logoUrl || product.seller?.avatarUrl || ''} alt={storeName} className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-2xl text-[#38bdf8]">storefront</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {store?.slug ? (
            <Link href={`/magaza/${store.slug}`} className="font-display font-extrabold text-sm text-white hover:text-[#38bdf8] transition-colors truncate block">
              {storeName}
            </Link>
          ) : (
            <span className="font-display font-extrabold text-sm text-white truncate block">{storeName}</span>
          )}
          <span className="text-[11px] text-[#64748b] block mt-0.5">{product.sellerId ? 'Pazar Yeri Satıcısı' : 'Platform Ürünü'}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-[#1a1e2d]">
        {stats && (
          <>
            <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-[#0d0f17] border border-[#171a26]">
              <span className="text-[#94a3b8] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-amber-400">star</span>
                Mağaza Puanı
              </span>
              <span className="font-bold text-white">
                {stats.avgRating !== null ? (
                  <>
                    <span className="text-amber-400">{stats.avgRating.toFixed(1)}</span>
                    <span className="text-[10px] text-[#64748b]"> ({stats.reviewCount} değerlendirme)</span>
                  </>
                ) : (
                  <span className="text-[11px] text-[#64748b]">Henüz değerlendirme yok</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-[#0d0f17] border border-[#171a26]">
              <span className="text-[#94a3b8] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                Satılan Kod
              </span>
              <span className="font-bold text-emerald-400 font-mono">{stats.totalSales}</span>
            </div>
          </>
        )}
        <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-[#0d0f17] border border-[#171a26]">
          <span className="text-[#94a3b8] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-indigo-400">security</span>
            Güvenli Ödeme
          </span>
          <span className="text-[11px] font-bold text-indigo-300">Escrow Koruması</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        {store?.slug && (
          <Link
            href={`/magaza/${store.slug}`}
            className="py-2.5 px-2.5 rounded-xl bg-[#161a28] hover:bg-[#1f2438] border border-[#22283a] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-sm text-[#38bdf8]">storefront</span>
            Mağazayı Gör
          </Link>
        )}
        {product.sellerId && (
          <Link
            href={`/hesabim/mesajlar?target=${product.sellerId}&product=${product.id}`}
            className={`py-2.5 px-2.5 rounded-xl bg-[#161a28] hover:bg-[#1f2438] border border-[#22283a] text-[#38bdf8] font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              !store?.slug ? 'col-span-2' : ''
            }`}
          >
            <span className="material-symbols-outlined text-sm">chat</span>
            Satıcıya Sor
          </Link>
        )}
      </div>
    </div>
  );
}

export default function ProductPurchasePanel({ product }: { product: Product }) {
  const router = useRouter();
  const { user } = useAuth();
  const { add } = useCart();
  const isPublic = product.approvalStatus === 'APPROVED' && product.isActive;
  const isOwnListing = !!user && product.sellerId === user.id;
  const firstAvailable = product.variants.find((v) => v.availableStock > 0) ?? product.variants[0];

  const [selected, setSelected] = useState<ProductVariant | undefined>(firstAvailable);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const stock = selected?.availableStock ?? 0;
  const canBuy = isPublic && !isOwnListing && !!selected && stock > 0;
  const isManual = product.deliveryType === 'MANUAL';

  const addToCart = async () => {
    if (!selected || !canBuy) return false;
    setLoading(true);
    setMessage(null);
    try {
      await add({
        variantId: selected.id,
        quantity: Math.min(quantity, stock),
        unitPrice: selected.price,
        title: product.title,
        denomination: selected.denomination,
        imageUrl: product.imageUrl,
        slug: product.slug,
        deliveryType: product.deliveryType,
        storeName: product.store?.name ?? null,
      });
      setMessage({ type: 'success', text: 'Ürün sepete eklendi!' });
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, 'Ürün sepete eklenemedi') });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const buyNow = async () => {
    if (await addToCart()) router.push('/sepet');
  };

  return (
    <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] shadow-xl flex flex-col gap-6">
      {!isPublic && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3">
          <span className="material-symbols-outlined text-xl text-amber-400 shrink-0 mt-0.5">lock_clock</span>
          <div className="text-xs">
            <span className="font-bold block text-sm mb-1 text-white">
              {product.approvalStatus === 'REJECTED' ? 'İlan Reddedildi' : !product.isActive ? 'İlan Satışa Kapalı' : 'İlan Onay Aşamasında (Önizleme)'}
            </span>
            {product.rejectedReason ? `Gerekçe: ${product.rejectedReason}` : 'Bu ilan şu anda satışa kapalıdır ve yalnızca yetkililer tarafından görüntülenebilir.'}
          </div>
        </div>
      )}

      {message && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-xs font-bold ${
            message.type === 'success' ? 'bg-[#10b981]/20 border border-[#10b981] text-emerald-300' : 'bg-rose-950/60 border border-rose-800 text-rose-300'
          }`}
        >
          <span className="material-symbols-outlined text-base">{message.type === 'success' ? 'check_circle' : 'error'}</span>
          {message.text}
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider block mb-3">Paket / Tutar Seçin:</label>
        <div className="grid grid-cols-2 gap-2.5">
          {product.variants.map((v) => {
            const isSelected = selected?.id === v.id;
            const outOfStock = v.availableStock <= 0;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setSelected(v);
                  setQuantity(1);
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  isSelected ? 'border-[#2563eb] bg-[#161a26] ring-2 ring-[#2563eb]/40' : 'border-[#1e2230] hover:border-[#2563eb]/50 bg-[#0d0e14]'
                } ${outOfStock ? 'opacity-50' : ''}`}
              >
                <span className="text-xs font-bold text-white line-clamp-1">{v.denomination}</span>
                <span className="text-sm font-display font-extrabold text-[#38bdf8] mt-1">{formatTRY(v.price)}</span>
                {v.originalPrice && v.originalPrice > v.price && (
                  <span className="text-[10px] text-[#64748b] line-through">{formatTRY(v.originalPrice)}</span>
                )}
                {outOfStock && <span className="text-[10px] font-bold text-rose-400">Tükendi</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#1c1f2b]">
        <div>
          <span className="text-xs text-[#64748b] block font-medium">Stok Durumu</span>
          {stock > 0 ? (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {isManual ? `${stock} adet · ${product.deliveryDeadlineHours} saat içinde teslim` : `${stock} kod · Anında teslim`}
            </span>
          ) : (
            <span className="text-xs font-bold text-rose-400 mt-0.5 block">Stokta yok</span>
          )}
        </div>

        <div className="flex items-center gap-2 bg-[#0d0e14] border border-[#1c1f2b] rounded-xl p-1">
          <button
            type="button"
            aria-label="Azalt"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-7 h-7 rounded-lg bg-[#161824] hover:bg-[#202334] border border-[#222534] flex items-center justify-center text-sm font-bold text-white"
          >
            -
          </button>
          <span className="font-mono text-xs font-bold px-2 text-white">{quantity}</span>
          <button
            type="button"
            aria-label="Arttır"
            disabled={quantity >= stock}
            onClick={() => setQuantity(Math.min(stock, quantity + 1))}
            className="w-7 h-7 rounded-lg bg-[#161824] hover:bg-[#202334] border border-[#222534] flex items-center justify-center text-sm font-bold text-white disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <div className="bg-[#0d0e14] border border-[#1c1f2b] rounded-xl p-4 flex items-center justify-between">
        <div>
          <span className="text-xs text-[#94a3b8] block">Toplam Tutar:</span>
          <span className="font-display font-black text-2xl text-white">{formatTRY((selected?.price ?? 0) * quantity)}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-[#64748b] block uppercase font-mono">Teslimat</span>
          <span className="text-xs font-bold text-[#38bdf8] flex items-center gap-0.5 justify-end">
            {isManual && <span className="material-symbols-outlined text-xs">schedule</span>}
            {isManual ? `${product.deliveryDeadlineHours} saat içinde` : 'Anında'}
          </span>
        </div>
      </div>

      {!isGlobalRegion(product.region) && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-100 flex gap-2">
          <span className="material-symbols-outlined text-base text-amber-300">public</span>
          <span>
            Bu kod yalnızca <strong>{regionLabel(product.region)}</strong> bölgesindeki hesaplarda çalışır. Satın almadan önce hesabınızın bölgesini kontrol edin;
            bölge uyumsuzluğu iade nedeni sayılmaz.
          </span>
        </div>
      )}

      <StoreCard product={product} />

      {isOwnListing ? (
        <div className="p-3 rounded-xl bg-[#161824] border border-[#222534] text-xs text-[#94a3b8] text-center">
          Bu sizin ilanınız. İlanı <Link href="/hesabim/pazar" className="text-[#38bdf8] font-bold hover:underline">Pazar İlanlarım</Link> sayfasından yönetebilirsiniz.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={loading || !canBuy}
            onClick={buyNow}
            className="w-full py-3.5 px-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {canBuy ? 'Hemen Satın Al' : 'Satın Alınamaz'}
          </button>
          <button
            type="button"
            disabled={loading || !canBuy}
            onClick={addToCart}
            className="w-full py-3 px-4 rounded-xl bg-[#161824] hover:bg-[#1d2030] border border-[#222636] text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-base text-[#38bdf8]">add_shopping_cart</span>
            {loading ? 'Ekleniyor...' : 'Sepete Ekle'}
          </button>
        </div>
      )}
    </div>
  );
}
