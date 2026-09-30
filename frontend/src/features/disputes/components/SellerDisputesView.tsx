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
import { useSellerDisputes, useSellerRespond } from '../hooks/useDisputes';
import { sellerRespondSchema, SellerRespondValues } from '../schemas/dispute.schema';
import { Dispute } from '../types';
import { DisputeCard } from './DisputeCard';

const ACTIONS: { value: SellerRespondValues['action']; icon: string; label: string; desc: string }[] = [
  { value: 'REFUND', icon: 'undo', label: 'İade Et', desc: 'Havuzdaki tutar alıcıya iade edilir.' },
  { value: 'REPLACE', icon: 'swap_horiz', label: 'Yeni Kod Gönder', desc: 'Alıcıya çalışan yeni bir kod iletilir.' },
  { value: 'REJECT', icon: 'report', label: 'Kabul Etmiyorum', desc: 'Hakem ekibi nihai karar verir.' },
];

function RespondModal({ dispute, onClose, onDone }: { dispute: Dispute; onClose: () => void; onDone: (msg: string, ok: boolean) => void }) {
  const respond = useSellerRespond();
  const { register, handleSubmit, watch, setValue, formState } = useForm<SellerRespondValues>({ resolver: zodResolver(sellerRespondSchema) });
  const action = watch('action');

  const submit = handleSubmit(async (v) => {
    try {
      await respond.mutateAsync({ id: dispute.id, action: v.action, response: v.response, replacementCode: v.action === 'REPLACE' ? v.replacementCode : undefined });
      onDone('Yanıtınız kaydedildi.', true);
    } catch (err) {
      onDone(getErrorMessage(err), false);
    }
  });

  return (
    <Modal open onClose={() => !respond.isPending && onClose()} title={`İtirazı Yanıtla · #${dispute.order.orderNumber}`} maxWidth="max-w-2xl">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ACTIONS.map((a) => (
            <button
              key={a.value}
              type="button"
              aria-pressed={action === a.value}
              onClick={() => setValue('action', a.value, { shouldValidate: true })}
              className={`text-left p-4 rounded-xl border transition-all ${action === a.value ? 'border-[#2563eb] bg-[#2563eb]/10' : 'border-[#1c1f2b] bg-[#090a0f]'}`}
            >
              <span className="material-symbols-outlined text-lg text-[#38bdf8]">{a.icon}</span>
              <div className="font-semibold text-sm text-white">{a.label}</div>
              <div className="text-xs text-[#64748b] mt-1">{a.desc}</div>
            </button>
          ))}
        </div>
        {formState.errors.action && <p className="text-[11px] text-rose-400">{formState.errors.action.message}</p>}
        {action === 'REPLACE' && (
          <FormField label="Yeni kod" error={formState.errors.replacementCode?.message}>
            <input maxLength={500} className={`${inputClass} font-mono`} {...register('replacementCode')} />
          </FormField>
        )}
        <FormField label="Açıklamanız (alıcı ve hakem görür)" error={formState.errors.response?.message}>
          <textarea rows={3} maxLength={1000} className={inputClass} {...register('response')} />
        </FormField>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={respond.isPending}>
            Vazgeç
          </Button>
          <Button type="submit" className="flex-1" loading={respond.isPending}>
            Yanıtı Gönder
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function SellerDisputesView() {
  const disputes = useSellerDisputes();
  const [target, setTarget] = useState<Dispute | null>(null);
  const { toast, show } = useToast();

  if (disputes.isPending) return <LoadingState />;
  if (disputes.isError) return <ErrorState message={getErrorMessage(disputes.error)} onRetry={() => disputes.refetch()} />;
  const waiting = disputes.data.filter((d) => d.status === 'WAITING_SELLER').length;

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-400">gavel</span>
            <h1 className="font-display font-extrabold text-xl text-white">Gelen İtirazlar</h1>
          </div>
          <p className="text-xs text-[#94a3b8] mt-1">48 saat içinde yanıt vermediğiniz itirazlar otomatik olarak hakem ekibine aktarılır.</p>
        </div>
        {waiting > 0 && <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">{waiting} yanıt bekliyor</span>}
      </div>

      {disputes.data.length === 0 ? (
        <EmptyState icon="verified" title="İtiraz yok" description="Satışlarınıza açılmış bir itiraz bulunmuyor." />
      ) : (
        <div className="flex flex-col gap-4">
          {disputes.data.map((d) => (
            <DisputeCard
              key={d.id}
              dispute={d}
              actions={
                d.status === 'WAITING_SELLER' ? (
                  <button type="button" onClick={() => setTarget(d)} className="px-4 py-1.5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold">
                    Yanıtla
                  </button>
                ) : undefined
              }
            />
          ))}
        </div>
      )}

      {target && (
        <RespondModal
          dispute={target}
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
