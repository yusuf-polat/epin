'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/utils/format';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Pagination } from '@/components/shared/Pagination';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { AUDIT_ACTION_GROUPS, METADATA_LABELS, TARGET_LINKS } from '../constants';
import { AuditParams } from '../types';

const selectClass = 'px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs text-white focus:outline-none focus:border-[#38bdf8]';

function formatValue(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

export default function AuditLogView() {
  const [params, setParams] = useState<AuditParams>({ page: 1 });
  const [text, setText] = useState('');
  const list = useAuditLogs(params);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-4">
        <div>
          <h1 className="font-display font-extrabold text-xl text-white">İşlem Geçmişi</h1>
          <p className="text-xs text-[#64748b] mt-1">Yönetim ekibinin yaptığı tüm işlemler: kim, ne zaman, hangi kayıt üzerinde, hangi gerekçeyle. Kayıtlar değiştirilemez.</p>
        </div>
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setParams({ ...params, page: 1, search: text.trim() || undefined });
          }}
        >
          <select value={params.action ?? ''} onChange={(e) => setParams({ ...params, page: 1, action: e.target.value || undefined })} className={selectClass} aria-label="İşlem türü">
            <option value="">Tüm işlemler</option>
            {AUDIT_ACTION_GROUPS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={100} placeholder="Yönetici e-postası, açıklama veya kayıt no" className={`${selectClass} flex-1`} />
          <button type="submit" className="px-4 py-2 rounded-xl bg-[#161824] border border-[#222534] text-white text-xs font-bold">
            Ara
          </button>
        </form>
      </div>

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState message={getErrorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState icon="history" title="Kayıt bulunamadı" />
      ) : (
        <div className="bg-[#10121a] rounded-2xl border border-[#1c1f2b] overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1c1f2b] text-[#64748b]">
                <th className="text-left px-4 py-3">Tarih</th>
                <th className="text-left px-4 py-3">Yönetici</th>
                <th className="text-left px-4 py-3">İşlem</th>
                <th className="text-left px-4 py-3">Ayrıntı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1f2b]">
              {list.data.items.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="px-4 py-2.5 text-[#94a3b8] whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                    {log.ip && <div className="font-mono text-[10px] text-[#475569]">{log.ip}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-white whitespace-nowrap">
                    {log.actor?.name ?? 'Silinmiş kullanıcı'}
                    {log.actor && <div className="text-[11px] text-[#64748b]">{log.actor.email}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-white font-bold">{log.summary}</div>
                    <div className="font-mono text-[10px] text-[#475569]">
                      {log.action}
                      {log.targetId && (
                        <>
                          {' · '}
                          {TARGET_LINKS[log.targetType] ? (
                            <Link href={TARGET_LINKS[log.targetType]} className="hover:text-[#38bdf8]">
                              {log.targetType} {log.targetId.slice(0, 8)}
                            </Link>
                          ) : (
                            `${log.targetType} ${log.targetId.slice(0, 8)}`
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[#94a3b8] max-w-[360px]">
                    {log.metadata
                      ? Object.entries(log.metadata).map(([key, value]) => (
                          <div key={key} className="break-words">
                            <span className="text-[#64748b]">{METADATA_LABELS[key] ?? key}:</span> {formatValue(value)}
                          </div>
                        ))
                      : '—'}
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
