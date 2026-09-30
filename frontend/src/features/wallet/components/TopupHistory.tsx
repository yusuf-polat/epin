'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime, formatTRY } from '@/lib/utils/format';
import { Pagination } from '@/components/shared/Pagination';
import { useMyPayments } from '@/features/payments/hooks/usePayments';
import { PAYMENT_STATUS, PROVIDER_META } from '@/features/payments/constants';
import { useCancelDeposit, useMyDeposits } from '../hooks/useWallet';
import { DEPOSIT_STATUS } from '../constants';

type Notify = (msg: string, ok: boolean) => void;

function OnlinePayments() {
  const [page, setPage] = useState(1);
  const payments = useMyPayments(page);
  if (payments.isError) return <p className="text-xs text-rose-300 py-3">{getErrorMessage(payments.error)}</p>;
  if (!payments.data?.items.length) return <p className="text-xs text-[#64748b] py-3">Henüz online ödemeniz yok.</p>;
  return (
    <>
      <div className="divide-y divide-[#1c1f2b]">
        {payments.data.items.map((p) => (
          <Link key={p.id} href={`/hesabim/cuzdan/odeme/${p.id}`} className="py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] -mx-2 px-2 rounded-lg">
            <div className="min-w-0 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#38bdf8]">{PROVIDER_META[p.provider].icon}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{PROVIDER_META[p.provider].label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${PAYMENT_STATUS[p.status].className}`}>{PAYMENT_STATUS[p.status].label}</span>
                  {p.testMode && <span className="text-[10px] font-bold text-amber-300">TEST</span>}
                </div>
                <div className="text-[11px] text-[#64748b] truncate">
                  {formatDateTime(p.createdAt)}
                  {p.fee > 0 ? ` · ${formatTRY(p.chargeAmount)} ödendi (hizmet bedeli ${formatTRY(p.fee)})` : ''}
                  {p.failureReason && p.status !== 'SUCCEEDED' ? ` · ${p.failureReason}` : ''}
                </div>
              </div>
            </div>
            <span className="font-mono font-bold text-sm text-white shrink-0">{formatTRY(p.amount)}</span>
          </Link>
        ))}
      </div>
      <Pagination page={payments.data.meta.page} totalPages={payments.data.meta.totalPages} onChange={setPage} />
    </>
  );
}

function ManualDeposits({ notify }: { notify: Notify }) {
  const [page, setPage] = useState(1);
  const deposits = useMyDeposits(page);
  const cancel = useCancelDeposit();

  const onCancel = async (id: string) => {
    try {
      await cancel.mutateAsync(id);
      notify('Yükleme talebi iptal edildi.', true);
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  };

  if (!deposits.data?.items.length) return <p className="text-xs text-[#64748b] py-3">Henüz havale veya kripto yükleme talebiniz yok.</p>;
  return (
    <>
      <div className="divide-y divide-[#1c1f2b]">
        {deposits.data.items.map((d) => (
          <div key={d.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="material-symbols-outlined text-sm text-[#38bdf8]">{d.method === 'CRYPTO' ? 'wallet' : 'account_balance'}</span>
                <span className="font-mono text-xs text-white">{d.referenceCode}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${DEPOSIT_STATUS[d.status].className}`}>{DEPOSIT_STATUS[d.status].label}</span>
              </div>
              <div className="text-[11px] text-[#64748b] break-all">
                {formatDateTime(d.createdAt)} · {d.method === 'CRYPTO' ? `${d.network} · ${d.txHash}` : d.senderName}
                {d.adminNote && d.status === 'REJECTED' ? ` · ${d.adminNote}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono font-bold text-sm text-white">{formatTRY(d.approvedAmount ?? d.amount)}</span>
              {d.status === 'PENDING' && (
                <button type="button" disabled={cancel.isPending} onClick={() => onCancel(d.id)} className="text-[11px] font-bold text-rose-300 hover:underline">
                  İptal
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <Pagination page={deposits.data.meta.page} totalPages={deposits.data.meta.totalPages} onChange={setPage} />
    </>
  );
}

/** Kullanıcının tüm bakiye yükleme geçmişi (online ödemeler ve onaylı talepler) */
export function TopupHistory({ notify }: { notify: Notify }) {
  const [tab, setTab] = useState<'online' | 'manual'>('online');
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mr-auto">Yükleme Geçmişim</h3>
        {(
          [
            ['online', 'Online Ödemeler'],
            ['manual', 'Havale & Kripto'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold border ${tab === value ? 'bg-[#161824] border-[#2c3245] text-white' : 'border-transparent text-[#64748b] hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'online' ? <OnlinePayments /> : <ManualDeposits notify={notify} />}
    </div>
  );
}
