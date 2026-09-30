'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime, formatTRY } from '@/lib/utils/format';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { usePayment, useRefreshBalance } from '../hooks/usePayments';
import { PAYMENT_POLL_LIMIT_MS, PAYMENT_STATUS, PROVIDER_META } from '../constants';
import { Payment } from '../types';

const linkClass = 'px-5 py-2.5 rounded-xl text-xs font-bold text-center';

function Summary({ payment }: { payment: Payment }) {
  return (
    <div className="w-full max-w-sm p-4 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs flex flex-col gap-1.5">
      {[
        ['Yöntem', PROVIDER_META[payment.provider].label],
        ['Cüzdana yüklenecek', formatTRY(payment.amount)],
        ['Hizmet bedeli', formatTRY(payment.fee)],
        ['Tahsil edilen', formatTRY(payment.chargeAmount)],
        ['Ödeme no', payment.id.slice(0, 8).toUpperCase()],
        ['Tarih', formatDateTime(payment.createdAt)],
      ].map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <span className="text-[#64748b]">{label}</span>
          <span className="font-mono text-white">{value}</span>
        </div>
      ))}
    </div>
  );
}

function Status({ icon, tone, title, children }: { icon: string; tone: string; title: string; children: React.ReactNode }) {
  return (
    <div className={`bg-[#10121a] rounded-3xl p-8 border ${tone} flex flex-col items-center gap-4 text-center`}>
      <span className="material-symbols-outlined text-5xl">{icon}</span>
      <h1 className="font-display font-black text-xl text-white">{title}</h1>
      {children}
    </div>
  );
}

export default function PaymentResultView({ id }: { id: string }) {
  const cancelled = useSearchParams().get('iptal') === '1';
  const payment = usePayment(id);
  const refreshBalance = useRefreshBalance();
  const refreshed = useRef(false);

  // PayTR dönüş sayfasını iframe içinde açar; sayfa üst pencereye taşınır
  useEffect(() => {
    if (window.top && window.top !== window.self) window.top.location.href = window.location.href;
  }, []);

  // Başarılı ödemede header bakiyesi ve cüzdan bir kez yenilenir
  useEffect(() => {
    if (payment.data?.status === 'SUCCEEDED' && !refreshed.current) {
      refreshed.current = true;
      void refreshBalance();
    }
  }, [payment.data?.status, refreshBalance]);

  if (payment.isPending) return <LoadingState label="Ödeme durumu sorgulanıyor..." />;
  if (payment.isError) return <ErrorState message={getErrorMessage(payment.error, 'Ödeme bulunamadı')} onRetry={() => payment.refetch()} />;
  const p = payment.data;

  if (p.status === 'SUCCEEDED') {
    return (
      <Status icon="check_circle" tone="border-emerald-500/40 text-emerald-400" title="Bakiyeniz Yüklendi">
        <p className="text-xs text-[#94a3b8]">{formatTRY(p.amount)} cüzdanınıza eklendi. Artık alışverişe başlayabilirsiniz.</p>
        <Summary payment={p} />
        <div className="flex gap-3">
          <Link href="/hesabim/cuzdan" className={`${linkClass} bg-[#161824] border border-[#222534] text-white`}>
            Cüzdanım
          </Link>
          <Link href="/katalog" className={`${linkClass} bg-[#2563eb] text-white`}>
            Alışverişe Başla
          </Link>
        </div>
      </Status>
    );
  }

  if (p.status !== 'PENDING') {
    return (
      <Status icon="error" tone="border-rose-500/40 text-rose-400" title={`Ödeme ${PAYMENT_STATUS[p.status].label}`}>
        <p className="text-xs text-[#94a3b8] max-w-md">{p.failureReason ?? 'Ödeme tamamlanamadı.'} Hesabınızdan çekim yapılmadıysa tekrar deneyebilirsiniz.</p>
        <Summary payment={p} />
        <Link href="/hesabim/cuzdan?sekme=yukle" className={`${linkClass} bg-[#2563eb] text-white`}>
          Tekrar Dene
        </Link>
      </Status>
    );
  }

  // PayTR formu sitede gömülü açılır; kullanıcı iptal edip dönmediyse gösterilir
  if (p.provider === 'PAYTR' && p.checkoutUrl && !cancelled) {
    return (
      <div className="bg-[#10121a] rounded-2xl p-4 sm:p-6 border border-[#1c1f2b] flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="font-display font-extrabold text-lg text-white">Kart ile Ödeme</h1>
            <p className="text-xs text-[#94a3b8]">
              {formatTRY(p.chargeAmount)} tahsil edilecek, {formatTRY(p.amount)} cüzdanınıza yüklenecek.
            </p>
          </div>
          {p.testMode && <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500/15 text-amber-300 self-start">TEST MODU</span>}
        </div>
        <iframe src={p.checkoutUrl} title="PayTR güvenli ödeme" className="w-full min-h-[620px] rounded-xl bg-white" allow="payment" />
        <p className="text-[11px] text-[#64748b] text-center">Ödeme onaylandığında bu sayfa otomatik olarak güncellenir.</p>
      </div>
    );
  }

  const stale = Date.now() - new Date(p.createdAt).getTime() > PAYMENT_POLL_LIMIT_MS;
  return (
    <Status icon={cancelled ? 'pending' : 'hourglass_top'} tone="border-amber-500/40 text-amber-300" title={cancelled ? 'Ödeme Tamamlanmadı' : 'Ödeme Onayı Bekleniyor'}>
      <p className="text-xs text-[#94a3b8] max-w-md">
        {cancelled
          ? 'Ödeme sayfasından ayrıldınız. Ödemeyi tamamladıysanız onay birkaç dakika içinde gelir; tamamlamadıysanız ödeme sayfasına dönebilirsiniz.'
          : p.provider === 'NOWPAYMENTS'
            ? 'Kripto ödemeniz ağda onaylandığında bakiyeniz otomatik yüklenir. Bu işlem ağ yoğunluğuna göre birkaç dakika ile birkaç saat sürebilir.'
            : 'Ödeme sağlayıcısından onay bekleniyor. Bu sayfa otomatik olarak güncellenir.'}
      </p>
      {p.failureReason && <p className="text-[11px] text-amber-200">{p.failureReason}</p>}
      <Summary payment={p} />
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/hesabim/cuzdan" className={`${linkClass} bg-[#161824] border border-[#222534] text-white`}>
          Cüzdanım
        </Link>
        {p.checkoutUrl && (
          <a href={p.checkoutUrl} className={`${linkClass} bg-[#2563eb] text-white`}>
            Ödeme Sayfasına Dön
          </a>
        )}
        {stale && (
          <button type="button" onClick={() => payment.refetch()} className={`${linkClass} bg-[#161824] border border-[#222534] text-white`}>
            Durumu Yenile
          </button>
        )}
      </div>
    </Status>
  );
}
