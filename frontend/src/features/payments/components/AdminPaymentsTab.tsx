'use client';

import { useState } from 'react';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime, formatTRY } from '@/lib/utils/format';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Pagination } from '@/components/shared/Pagination';
import { useAdminPayments, useSyncPayment } from '../hooks/usePayments';
import { PAYMENT_STATUS, PROVIDER_META } from '../constants';
import { PaymentStatus } from '../types';

const selectClass = 'px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs text-white focus:outline-none focus:border-[#38bdf8]';
const ONLINE = ['PAYTR', 'IYZICO', 'STRIPE', 'NOWPAYMENTS'] as const;
/** Durumu sağlayıcıdan elle sorgulanabilen sağlayıcılar */
const SYNCABLE = new Set(['STRIPE', 'IYZICO']);

/** Finans ekranı: kart ve kripto sağlayıcılarıyla yapılan online bakiye yüklemeleri */
export default function AdminPaymentsTab({ notify }: { notify: (msg: string, ok: boolean) => void }) {
  const [params, setParams] = useState({ page: 1, status: '', provider: '', search: '' });
  const [text, setText] = useState('');
  const list = useAdminPayments({
    page: params.page,
    status: params.status || undefined,
    provider: params.provider || undefined,
    search: params.search || undefined,
  });
  const sync = useSyncPayment();

  const onSync = async (id: string) => {
    try {
      const p = await sync.mutateAsync(id);
      notify(`Güncel durum: ${PAYMENT_STATUS[p.status].label}`, true);
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setParams({ ...params, search: text.trim(), page: 1 });
        }}
      >
        <select value={params.status} onChange={(e) => setParams({ ...params, status: e.target.value, page: 1 })} className={selectClass} aria-label="Durum">
          <option value="">Tüm durumlar</option>
          {(Object.keys(PAYMENT_STATUS) as PaymentStatus[]).map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS[s].label}
            </option>
          ))}
        </select>
        <select value={params.provider} onChange={(e) => setParams({ ...params, provider: e.target.value, page: 1 })} className={selectClass} aria-label="Sağlayıcı">
          <option value="">Tüm sağlayıcılar</option>
          {ONLINE.map((p) => (
            <option key={p} value={p}>
              {PROVIDER_META[p].label}
            </option>
          ))}
        </select>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={100} placeholder="E-posta, ödeme no veya sağlayıcı ref." className={`${selectClass} flex-1`} />
        <button type="submit" className="px-4 py-2 rounded-xl bg-[#161824] border border-[#222534] text-white text-xs font-bold">
          Ara
        </button>
      </form>

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState message={getErrorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState icon="credit_card_off" title="Online ödeme bulunamadı" />
      ) : (
        <div className="bg-[#10121a] rounded-2xl border border-[#1c1f2b] overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1c1f2b] text-[#64748b]">
                <th className="text-left px-4 py-3">Tarih</th>
                <th className="text-left px-4 py-3">Kullanıcı</th>
                <th className="text-left px-4 py-3">Sağlayıcı</th>
                <th className="text-left px-4 py-3">Durum</th>
                <th className="text-right px-4 py-3">Yüklenen</th>
                <th className="text-right px-4 py-3">Tahsil</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1f2b]">
              {list.data.items.map((p) => (
                <tr key={p.id} className="align-top">
                  <td className="px-4 py-2.5 text-[#94a3b8] whitespace-nowrap">
                    {formatDateTime(p.createdAt)}
                    <div className="font-mono text-[10px] text-[#475569]">#{p.id.slice(0, 8).toUpperCase()}</div>
                  </td>
                  <td className="px-4 py-2.5 text-white">
                    {p.user.name}
                    <div className="text-[11px] text-[#64748b]">{p.user.email}</div>
                  </td>
                  <td className="px-4 py-2.5 text-[#94a3b8] whitespace-nowrap">
                    {PROVIDER_META[p.provider].label}
                    {p.testMode && <span className="ml-1 text-[10px] font-bold text-amber-300">TEST</span>}
                    {p.providerRef && <div className="font-mono text-[10px] text-[#475569] max-w-[160px] truncate">{p.providerRef}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${PAYMENT_STATUS[p.status].className}`}>{PAYMENT_STATUS[p.status].label}</span>
                    {p.failureReason && <div className="text-[11px] text-[#64748b] mt-1 max-w-[220px]">{p.failureReason}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-white">{formatTRY(p.amount)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[#94a3b8]">{formatTRY(p.chargeAmount)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {SYNCABLE.has(p.provider) && (p.status === 'PENDING' || p.status === 'EXPIRED') && (
                      <button type="button" disabled={sync.isPending} onClick={() => onSync(p.id)} className="text-[11px] font-bold text-[#38bdf8] hover:underline whitespace-nowrap">
                        Sağlayıcıdan Sorgula
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.data && <Pagination page={list.data.meta.page} totalPages={list.data.meta.totalPages} onChange={(page) => setParams({ ...params, page })} />}
    </div>
  );
}
