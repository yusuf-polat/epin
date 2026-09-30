'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/utils/format';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Pagination } from '@/components/shared/Pagination';
import { Toast, useToast } from '@/components/shared/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, inputClass } from '@/components/ui/FormField';
import { useAdminComplaints, useResolveComplaint } from '../hooks/useComplaints';
import { COMPLAINT_STATUS, TAKEDOWN_LABELS, TARGET_LABELS } from '../constants';
import { AdminComplaint, ComplaintStatus, ComplaintTarget } from '../types';

const selectClass = 'px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs text-white focus:outline-none focus:border-[#38bdf8]';

function ResolveModal({ complaint, onClose, onDone }: { complaint: AdminComplaint; onClose: () => void; onDone: (msg: string, ok: boolean) => void }) {
  const resolve = useResolveComplaint();
  const [status, setStatus] = useState<'RESOLVED' | 'DISMISSED'>('RESOLVED');
  const [takeDown, setTakeDown] = useState(false);
  const [note, setNote] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await resolve.mutateAsync({ id: complaint.id, status, note: note.trim(), takeDown: status === 'RESOLVED' && takeDown });
      onDone(`${res.closedCount} şikâyet sonuçlandırıldı${res.takenDown ? ', içerik kaldırıldı' : ''}.`, true);
      onClose();
    } catch (err) {
      onDone(getErrorMessage(err), false);
    }
  };

  return (
    <Modal open onClose={() => !resolve.isPending && onClose()} title="Şikâyeti Sonuçlandır">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {complaint.openCountForTarget > 1 && (
          <p className="text-xs text-amber-200">Bu içerik hakkındaki {complaint.openCountForTarget} açık şikâyetin tamamı aynı kararla kapatılır.</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['RESOLVED', 'Haklı (ihlal var)'],
              ['DISMISSED', 'Reddet (ihlal yok)'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`p-3 rounded-xl border text-xs font-bold ${status === value ? 'border-[#2563eb] bg-[#2563eb]/10 text-white' : 'border-[#1c1f2b] text-[#94a3b8]'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {status === 'RESOLVED' && complaint.target && (
          <label className="flex items-center gap-2 text-xs text-white">
            <input type="checkbox" checked={takeDown} onChange={(e) => setTakeDown(e.target.checked)} className="accent-rose-500" />
            {TAKEDOWN_LABELS[complaint.targetType]} (içerik sahibi bilgilendirilir)
          </label>
        )}
        <FormField label="Açıklama (şikâyet edene ve gerekirse içerik sahibine iletilir)">
          <textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
        </FormField>
        <Button type="submit" variant={takeDown && status === 'RESOLVED' ? 'danger' : 'primary'} loading={resolve.isPending} disabled={note.trim().length < 3}>
          Kaydet
        </Button>
      </form>
    </Modal>
  );
}

export default function AdminComplaintsView() {
  const [params, setParams] = useState({ page: 1, status: 'OPEN', targetType: '' });
  const list = useAdminComplaints({ page: params.page, status: params.status || undefined, targetType: params.targetType || undefined });
  const [resolving, setResolving] = useState<AdminComplaint | null>(null);
  const { toast, show } = useToast();

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-4">
        <div>
          <h1 className="font-display font-extrabold text-xl text-white">Şikâyetler</h1>
          <p className="text-xs text-[#64748b] mt-1">Kullanıcıların ilan, mağaza ve yorum şikâyetlerini inceleyin. Haklı bulunan içerikler tek adımda kaldırılabilir.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select value={params.status} onChange={(e) => setParams({ ...params, status: e.target.value, page: 1 })} className={selectClass} aria-label="Durum">
            {(Object.keys(COMPLAINT_STATUS) as ComplaintStatus[]).map((s) => (
              <option key={s} value={s}>
                {COMPLAINT_STATUS[s].label}
              </option>
            ))}
            <option value="">Tümü</option>
          </select>
          <select value={params.targetType} onChange={(e) => setParams({ ...params, targetType: e.target.value, page: 1 })} className={selectClass} aria-label="Tür">
            <option value="">Tüm içerikler</option>
            {(Object.keys(TARGET_LABELS) as ComplaintTarget[]).map((t) => (
              <option key={t} value={t}>
                {TARGET_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState message={getErrorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState icon="verified_user" title="Bu listede şikâyet yok" />
      ) : (
        <div className="bg-[#10121a] rounded-2xl border border-[#1c1f2b] divide-y divide-[#1c1f2b]">
          {list.data.items.map((c) => (
            <div key={c.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#1f2438] text-[#38bdf8] border border-[#263150]">{TARGET_LABELS[c.targetType]}</span>
                  <span className="text-xs font-bold text-white">{c.reasonLabel}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${COMPLAINT_STATUS[c.status].className}`}>{COMPLAINT_STATUS[c.status].label}</span>
                  {c.status === 'OPEN' && c.openCountForTarget > 1 && <span className="text-[10px] font-bold text-rose-300">{c.openCountForTarget} açık şikâyet</span>}
                </div>
                <div className="text-xs text-[#94a3b8] truncate">
                  {c.target ? (
                    <Link href={c.target.link} target="_blank" className="text-white hover:underline">
                      {c.target.title}
                    </Link>
                  ) : (
                    <span className="text-[#64748b]">İçerik kaldırılmış</span>
                  )}
                </div>
                {c.details && <p className="text-xs text-[#94a3b8] whitespace-pre-line">&ldquo;{c.details}&rdquo;</p>}
                <div className="text-[11px] text-[#64748b]">
                  {formatDateTime(c.createdAt)} · {c.reporter.name} ({c.reporter.email})
                  {c.resolutionNote ? ` · Karar: ${c.resolutionNote}${c.resolvedBy ? ` (${c.resolvedBy.name})` : ''}` : ''}
                </div>
              </div>
              {c.status === 'OPEN' && (
                <Button className="shrink-0" onClick={() => setResolving(c)}>
                  İncele
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {list.data && <Pagination page={list.data.meta.page} totalPages={list.data.meta.totalPages} onChange={(page) => setParams({ ...params, page })} />}
      {resolving && <ResolveModal complaint={resolving} onClose={() => setResolving(null)} onDone={(msg, ok) => show(msg, ok ? 'success' : 'error')} />}
      <Toast toast={toast} />
    </div>
  );
}
