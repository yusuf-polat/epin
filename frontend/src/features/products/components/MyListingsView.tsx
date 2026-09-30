'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getErrorMessage } from '@/lib/api';
import { formatTRY } from '@/lib/utils/format';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Toast, useToast } from '@/components/shared/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { splitLines } from '@/lib/validations/common';
import { useAddCodes, useMyListings, useRemoveListing, useSetStock } from '../hooks/useProducts';
import { LISTING_STATUS, MAX_CODES_PER_REQUEST } from '../constants';
import { SellerListing } from '../types';
import { ListingVisibilityButton } from './ListingVisibilityButton';

export default function MyListingsView() {
  const { user } = useAuth();
  const isSeller = !!user && (user.canSell || user.role === 'ADMIN');
  const listingsQuery = useMyListings(isSeller);
  const listings = listingsQuery.data ?? [];
  const setStock = useSetStock();
  const addCodes = useAddCodes();
  const removeListing = useRemoveListing();
  const busy = setStock.isPending || addCodes.isPending || removeListing.isPending;
  const [stockTarget, setStockTarget] = useState<SellerListing | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SellerListing | null>(null);
  const [codesText, setCodesText] = useState('');
  const [stockCount, setStockCount] = useState('');
  const { toast, show } = useToast();

  if (user && !isSeller) {
    return (
      <EmptyState
        icon="lock"
        title="Satıcı Yetkisi Gerekli"
        description="İlan oluşturmak için satıcı başvurusu yapmanız ve onay almanız gerekir."
        action={{ label: 'Satıcı Başvurusu Yap', href: '/hesabim/satici-basvuru' }}
      />
    );
  }

  const codes = codesText.split('\n').map((c) => c.trim()).filter(Boolean);

  const submitStock = async () => {
    if (!stockTarget) return;
    try {
      if (stockTarget.deliveryType === 'MANUAL') {
        await setStock.mutateAsync({ id: stockTarget.id, stockCount: Number(stockCount) });
        show('Stok güncellendi.');
      } else {
        const res = await addCodes.mutateAsync({ id: stockTarget.id, codes });
        show(`${res.addedCount} kod eklendi${res.skippedCount ? `, ${res.skippedCount} tekrar eden kod atlandı` : ''}.`);
      }
      setStockTarget(null);
    } catch (err) {
      show(getErrorMessage(err), 'error');
    }
  };

  const remove = async () => {
    if (!removeTarget) return;
    try {
      const res = await removeListing.mutateAsync(removeTarget.id);
      show(res.closed ? 'İlan satışa kapatıldı (satış geçmişi korunur).' : 'İlan silindi.');
      setRemoveTarget(null);
    } catch (err) {
      show(getErrorMessage(err), 'error');
    }
  };

  const totals = listings.reduce(
    (acc, l) => ({ available: acc.available + l.totalAvailable, sold: acc.sold + l.totalSold, revenue: acc.revenue + l.totalRevenue }),
    { available: 0, sold: 0, revenue: 0 }
  );

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-3xl p-6 sm:p-8 border border-[#1c1f2b] shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">Pazar İlanlarım</h1>
          <p className="text-xs text-[#94a3b8] mt-1.5 max-w-xl leading-relaxed">
            İlanlarınız onaylandıktan sonra yayına girer. Satış tutarı, alıcı onayından sonra komisyon düşülerek cüzdanınıza aktarılır. İçerik değişiklikleri yeniden onay gerektirir; fiyat değişiklikleri anında yayına yansır.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/hesabim/pazar/satislar" className="px-4 py-3 rounded-2xl bg-[#161824] border border-[#222534] text-white text-xs font-bold">
            Satışlarım
          </Link>
          <Link href="/hesabim/pazar/yeni" className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-black shadow-xl">
            <span className="material-symbols-outlined text-lg">add_circle</span>
            Yeni İlan
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Toplam İlan', value: String(listings.length), color: 'text-white' },
          { label: 'Satıştaki Stok', value: `${totals.available} adet`, color: 'text-emerald-400' },
          { label: 'Satılan', value: `${totals.sold} adet`, color: 'text-[#38bdf8]' },
          { label: 'Brüt Satış', value: formatTRY(totals.revenue), color: 'text-amber-400' },
        ].map((m) => (
          <div key={m.label} className="bg-[#10121a] p-5 rounded-2xl border border-[#1c1f2b]">
            <div className="text-[11px] text-[#64748b] font-bold uppercase tracking-wider">{m.label}</div>
            <div className={`font-display font-black text-2xl mt-1 ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>

      {listingsQuery.isPending ? (
        <LoadingState label="İlanlarınız yükleniyor..." />
      ) : listingsQuery.isError ? (
        <ErrorState message={getErrorMessage(listingsQuery.error)} onRetry={() => listingsQuery.refetch()} />
      ) : listings.length === 0 ? (
        <EmptyState icon="storefront" title="Henüz bir ilanınız bulunmuyor" description="İlk ürününüzü birkaç adımda satışa açabilirsiniz." action={{ label: 'İlk İlanınızı Oluşturun', href: '/hesabim/pazar/yeni' }} />
      ) : (
        <div className="bg-[#10121a] rounded-3xl border border-[#1c1f2b] divide-y divide-[#1c1f2b] overflow-hidden">
          {listings.map((item) => {
            const variant = item.variants[0];
            const status = !item.isActive ? LISTING_STATUS.CLOSED : !item.isListed ? LISTING_STATUS.UNLISTED : LISTING_STATUS[item.approvalStatus];
            return (
              <div key={item.id} className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 ${item.isActive && !item.isListed ? 'opacity-70' : ''}`}>
                <div className="flex items-start gap-4 min-w-0">
                  <img src={item.imageUrl} alt="" className="w-20 h-20 rounded-2xl object-cover border border-[#23293a] shrink-0" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${status.className}`}>{status.label}</span>
                      {item.isActive && !item.isListed && item.approvalStatus !== 'APPROVED' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${LISTING_STATUS[item.approvalStatus].className}`}>
                          {LISTING_STATUS[item.approvalStatus].label}
                        </span>
                      )}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-[#1f2438] text-[#38bdf8] border border-[#263150]">{item.category?.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white/5 text-[#94a3b8]">
                        {item.deliveryType === 'MANUAL' ? `Manuel · ${item.deliveryDeadlineHours} sa` : 'Anında'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${item.totalAvailable > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.totalAvailable > 0 ? `${item.totalAvailable} stok` : 'Stok yok'}
                      </span>
                    </div>
                    <h4 className="font-display font-black text-base text-white line-clamp-1">{item.title}</h4>
                    {item.approvalStatus === 'REJECTED' && item.rejectedReason && (
                      <p className="text-[11px] text-rose-300 mt-1">Red gerekçesi: {item.rejectedReason}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-5 mt-2 text-xs">
                      <span className="font-display font-black text-lg text-[#38bdf8]">{formatTRY(variant?.price)}</span>
                      <span className="text-[#64748b]">
                        Satılan: <strong className="text-white">{item.totalSold}</strong>
                      </span>
                      <span className="text-[#64748b]">
                        Brüt: <strong className="text-emerald-400">{formatTRY(item.totalRevenue)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 self-end sm:self-center shrink-0">
                  <Link
                    href={`/urun/${item.slug}`}
                    className="px-3.5 py-2 rounded-xl bg-[#161824] hover:bg-[#1f2334] text-[#cbd5e1] text-xs font-bold border border-[#23293a] flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    Görüntüle
                  </Link>
                  {item.isActive && (
                    <Link
                      href={`/hesabim/pazar/${item.id}/duzenle`}
                      className="px-3.5 py-2 rounded-xl bg-[#161824] hover:bg-[#1f2334] text-[#cbd5e1] text-xs font-bold border border-[#23293a] flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Düzenle
                    </Link>
                  )}
                  {item.isActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setStockTarget(item);
                        setCodesText('');
                        setStockCount(String(item.totalAvailable));
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#2563eb]/20 hover:bg-[#2563eb]/30 text-[#38bdf8] text-xs font-bold border border-[#2563eb]/35 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">add_box</span>
                      Stok
                    </button>
                  )}
                  {item.isActive && <ListingVisibilityButton id={item.id} isListed={item.isListed} onResult={show} />}
                  {item.isActive && (
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(item)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                      title="İlanı kalıcı olarak kaldır"
                      aria-label="İlanı kalıcı olarak kaldır"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!stockTarget} onClose={() => !busy && setStockTarget(null)} title={stockTarget?.deliveryType === 'MANUAL' ? 'Stok Adedini Güncelle' : 'Stoğa Kod Ekle'}>
        {stockTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-[#94a3b8] truncate">{stockTarget.title}</p>
            {stockTarget.deliveryType === 'MANUAL' ? (
              <input
                type="number"
                min={0}
                max={10000}
                value={stockCount}
                onChange={(e) => setStockCount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-white text-sm focus:outline-none focus:border-[#38bdf8]"
              />
            ) : (
              <>
                <textarea
                  rows={6}
                  value={codesText}
                  onChange={(e) => setCodesText(e.target.value)}
                  placeholder={'KOD-1111-2222\nKOD-3333-4444'}
                  className="w-full px-4 py-3 font-mono text-xs text-emerald-300 rounded-xl bg-[#090a0f] border border-[#1c1f2b] focus:outline-none focus:border-[#38bdf8]"
                />
                <span className="text-[11px] text-[#64748b]">Her satıra bir kod · {codes.length} kod eklenecek (en fazla {MAX_CODES_PER_REQUEST})</span>
              </>
            )}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStockTarget(null)} disabled={busy}>
                Vazgeç
              </Button>
              <Button
                className="flex-1"
                loading={busy}
                disabled={stockTarget.deliveryType === 'MANUAL' ? stockCount === '' || Number(stockCount) < 0 : codes.length === 0 || codes.length > MAX_CODES_PER_REQUEST}
                onClick={submitStock}
              >
                Kaydet
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!removeTarget} onClose={() => !busy && setRemoveTarget(null)} title="İlanı Kalıcı Olarak Kaldır">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[#94a3b8]">
            {removeTarget?.totalSold
              ? 'Bu ilanın satış geçmişi olduğu için silinmez; satışa kapatılır ve satılmamış kodlar temizlenir. Bu işlem geri alınamaz.'
              : 'İlan kalıcı olarak silinecek. Bu işlem geri alınamaz.'}
          </p>
          <p className="text-xs text-[#64748b]">
            İlanı sadece geçici olarak gizlemek istiyorsanız &quot;Yayından Kaldır&quot; butonunu kullanın; stok ve kodlarınız korunur.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setRemoveTarget(null)} disabled={busy}>
              Vazgeç
            </Button>
            <Button variant="danger" className="flex-1" loading={busy} onClick={remove}>
              Kaldır
            </Button>
          </div>
        </div>
      </Modal>
      <Toast toast={toast} />
    </div>
  );
}
