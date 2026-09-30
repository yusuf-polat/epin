'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils/format';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Pagination } from '@/components/shared/Pagination';
import { Toast, useToast } from '@/components/shared/Toast';
import { useMyPins, useRevealPin } from '../hooks/usePins';
import { DigitalPin } from '../types';
import { regionLabel } from '@/features/products/regions';

export default function PinVault() {
  const [page, setPage] = useState(1);
  const pins = useMyPins(page);
  const reveal = useRevealPin();
  const { copy, copiedKey } = useCopyToClipboard();
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const { toast, show } = useToast();

  const handleClick = async (pin: DigitalPin) => {
    const code = revealed[pin.id];
    if (code) {
      await copy(code, pin.id).catch(() => show('Kopyalanamadı; kodu seçip manuel kopyalayabilirsiniz.', 'error'));
      return;
    }
    try {
      const res = await reveal.mutateAsync(pin.id);
      setRevealed((prev) => ({ ...prev, [pin.id]: res.code }));
    } catch (err) {
      show(getErrorMessage(err, 'Kod gösterilemedi'), 'error');
    }
  };

  if (pins.isPending) return <LoadingState label="Kodlarınız getiriliyor..." />;
  if (pins.isError) return <ErrorState message={getErrorMessage(pins.error)} onRetry={() => pins.refetch()} />;

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] shadow-md">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#38bdf8]">vpn_key</span>
          <h1 className="font-display font-extrabold text-xl text-white">Dijital Kodlarım</h1>
        </div>
        <p className="text-xs text-[#94a3b8] mt-1">Satın aldığınız kodlar burada listelenir. Kodlar yalnızca siz &quot;Kodu Göster&quot; dediğinizde açılır.</p>
      </div>

      {pins.data.items.length === 0 ? (
        <EmptyState icon="key_off" title="Henüz Kayıtlı Kodunuz Yok" description="Satın aldığınız dijital kodlar burada listelenecektir." action={{ label: 'Kataloğu Keşfet', href: '/katalog' }} />
      ) : (
        <div className="flex flex-col gap-4">
          {pins.data.items.map((pin) => {
            const code = revealed[pin.id];
            const busy = reveal.isPending && reveal.variables === pin.id;
            return (
              <div key={pin.id} className="p-5 rounded-2xl bg-[#10121a] border border-[#1c1f2b] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#38bdf8]/40 transition-all">
                <div className="flex items-start gap-4 min-w-0">
                  <img src={pin.product.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-[#23293a] shrink-0" />
                  <div className="min-w-0">
                    <Link href={`/urun/${pin.product.slug}`} className="font-display font-bold text-sm text-white hover:text-[#38bdf8] line-clamp-1">
                      {pin.product.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#94a3b8] mt-1">
                      <span>{pin.product.denomination}</span>
                      {pin.order && <span>#{pin.order.orderNumber}</span>}
                      <span>{formatDate(pin.soldAt)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="px-4 py-2 rounded-lg bg-[#141620] border border-[#23293a] text-white font-mono text-sm tracking-wider font-bold select-all break-all">{code ?? pin.maskedCode}</div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleClick(pin)}
                        className="px-3 py-2 rounded-lg bg-[#1b1e2b] border border-[#2c3245] text-white hover:bg-[#2563eb] text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-base">{code ? (copiedKey === pin.id ? 'check' : 'content_copy') : 'visibility'}</span>
                        {code ? (copiedKey === pin.id ? 'Kopyalandı!' : 'Kopyala') : busy ? 'Açılıyor...' : 'Kodu Göster'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-[#94a3b8] sm:text-right shrink-0">
                  Bölge: <strong className="text-white">{regionLabel(pin.product.region)}</strong>
                  <div className="mt-1">{pin.product.brand}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Pagination page={pins.data.meta.page} totalPages={pins.data.meta.totalPages} onChange={setPage} />

      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-400 text-xl shrink-0 mt-0.5">warning</span>
        <div className="leading-relaxed">
          <strong>Güvenlik Uyarısı:</strong> Kodlarınızı üçüncü şahıslarla paylaşmayınız. Bir kodda sorun varsa, kodu açarken ekran kaydı alarak sipariş sayfasından itiraz açabilirsiniz.
        </div>
      </div>
      <Toast toast={toast} />
    </div>
  );
}
