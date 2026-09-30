'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Toast, useToast } from '@/components/shared/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, inputClass } from '@/components/ui/FormField';
import { useAdminDisputes, useResolveDispute } from '../hooks/useDisputes';
import { resolveDisputeSchema, ResolveDisputeValues } from '../schemas/dispute.schema';
import { DISPUTE_STATUS_LABELS } from '../constants';
import { Dispute, DisputeStatus } from '../types';
import { DisputeCard } from './DisputeCard';

const FILTERS: (DisputeStatus | 'ALL')[] = ['WAITING_SUPPORT', 'WAITING_SELLER', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'SELLER_APPROVED', 'CANCELLED', 'ALL'];

type Decision = { dispute: Dispute; decision: 'BUYER' | 'SELLER' };

function ResolveModal({ target, onClose, onDone }: { target: Decision; onClose: () => void; onDone: (msg: string, ok: boolean) => void }) {
  const resolve = useResolveDispute();
  const { register, handleSubmit, formState } = useForm<ResolveDisputeValues>({ resolver: zodResolver(resolveDisputeSchema) });

  const submit = handleSubmit(async ({ adminNotes }) => {
    try {
      await resolve.mutateAsync({ id: target.dispute.id, decision: target.decision, adminNotes });
      onDone('Hakem kararı uygulandı.', true);
    } catch (err) {
      onDone(getErrorMessage(err), false);
    }
  });

  return (
    <Modal open onClose={() => !resolve.isPending && onClose()} title="Hakem Kararı">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-[#94a3b8]">
          #{target.dispute.order.orderNumber} için karar:{' '}
          <strong className="text-white">{target.decision === 'BUYER' ? 'Alıcıya iade' : 'Satıcıya ödeme aktarımı'}</strong>
        </p>
        <FormField label="Karar gerekçesi (taraflara iletilir)" error={formState.errors.adminNotes?.message}>
          <textarea rows={4} maxLength={2000} className={inputClass} {...register('adminNotes')} />
        </FormField>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={resolve.isPending}>
            Vazgeç
          </Button>
          <Button type="submit" variant={target.decision === 'BUYER' ? 'primary' : 'success'} className="flex-1" loading={resolve.isPending}>
            Kararı Uygula
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminDisputesView() {
  const [status, setStatus] = useState<DisputeStatus | 'ALL'>('WAITING_SUPPORT');
  const disputes = useAdminDisputes(status === 'ALL' ? undefined : status);
  const [target, setTarget] = useState<Decision | null>(null);
  const { toast, show } = useToast();

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-400">balance</span>
          <h1 className="font-display font-extrabold text-xl text-white">İtiraz & Hakem Paneli</h1>
        </div>
        <p className="text-xs text-[#94a3b8] mt-1">Karar, havuzdaki tutarı alıcıya iade eder veya satıcıya aktarır. Bu işlem geri alınamaz.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatus(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${status === f ? 'bg-[#2563eb] border-[#2563eb] text-white' : 'bg-[#090a0f] border-[#1c1f2b] text-[#94a3b8] hover:text-white'}`}
            >
              {f === 'ALL' ? 'Tümü' : DISPUTE_STATUS_LABELS[f].label}
            </button>
          ))}
        </div>
      </div>

      {disputes.isPending ? (
        <LoadingState />
      ) : disputes.isError ? (
        <ErrorState message={getErrorMessage(disputes.error)} onRetry={() => disputes.refetch()} />
      ) : disputes.data.length === 0 ? (
        <EmptyState icon="task_alt" title="Bu durumda itiraz yok" />
      ) : (
        <div className="flex flex-col gap-4">
          {disputes.data.map((d) => (
            <DisputeCard
              key={d.id}
              dispute={d}
              actions={
                d.status === 'WAITING_SUPPORT' || d.status === 'WAITING_SELLER' ? (
                  <>
                    <button type="button" onClick={() => setTarget({ dispute: d, decision: 'BUYER' })} className="px-4 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-bold hover:bg-sky-500/20">
                      Alıcı Lehine (İade)
                    </button>
                    <button type="button" onClick={() => setTarget({ dispute: d, decision: 'SELLER' })} className="px-4 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold hover:bg-emerald-500/20">
                      Satıcı Lehine (Ödemeyi Aktar)
                    </button>
                  </>
                ) : undefined
              }
            />
          ))}
        </div>
      )}

      {target && (
        <ResolveModal
          target={target}
          onClose={() => setTarget(null)}
          onDone={(msg, ok) => {
            show(msg, ok ? 'success' : 'error');
            if (ok) setTarget(null);
          }}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}
