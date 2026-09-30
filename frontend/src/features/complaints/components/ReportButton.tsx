'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getErrorMessage } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormAlert, FormField, inputClass } from '@/components/ui/FormField';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCreateComplaint } from '../hooks/useComplaints';
import { COMPLAINT_REASONS, REPORT_TITLES } from '../constants';
import { ComplaintTarget } from '../types';

interface ReportButtonProps {
  targetType: ComplaintTarget;
  targetId: string;
  /** İçeriğin sahibi kendi içeriğini şikâyet edemez */
  ownerId?: string | null;
  variant?: 'button' | 'link';
}

/** İlan, mağaza veya yorumu şikâyet etme (giriş gerektirir) */
export default function ReportButton({ targetType, targetId, ownerId, variant = 'button' }: ReportButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const create = useCreateComplaint();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  if (user && ownerId && user.id === ownerId) return null;

  const detailsRequired = reason === 'OTHER';
  const canSubmit = !!reason && (!detailsRequired || details.trim().length >= 10);

  const onOpen = () => {
    if (!user) return router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    create.reset();
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({ targetType, targetId, reason, details: details.trim() || undefined });
    } catch {
      // Hata modal içinde gösterilir
    }
  };

  return (
    <>
      {variant === 'link' ? (
        <button type="button" onClick={onOpen} className="text-[10px] font-bold text-[#64748b] hover:text-rose-300 flex items-center gap-0.5">
          <span className="material-symbols-outlined text-[12px]">flag</span>
          Şikâyet et
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="px-3 py-2 rounded-xl bg-[#161824] border border-[#222534] text-[#94a3b8] hover:text-rose-300 text-xs font-bold flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm">flag</span>
          Şikâyet Et
        </button>
      )}
      <Modal open={open} onClose={() => !create.isPending && setOpen(false)} title={REPORT_TITLES[targetType]}>
        {create.isSuccess ? (
          <div className="flex flex-col gap-4">
            <FormAlert type="success" message="Şikâyetiniz alındı. Ekibimiz inceleyip sonucu size bildirecek." />
            <Button onClick={() => setOpen(false)}>Kapat</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">Neden</legend>
              {COMPLAINT_REASONS.map(([value, text]) => (
                <label key={value} className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer ${reason === value ? 'border-[#2563eb] bg-[#2563eb]/10 text-white' : 'border-[#1c1f2b] text-[#94a3b8]'}`}>
                  <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} className="accent-[#2563eb]" />
                  {text}
                </label>
              ))}
            </fieldset>
            <FormField label={`Açıklama${detailsRequired ? ' (en az 10 karakter)' : ' (isteğe bağlı)'}`}>
              <textarea rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} className={inputClass} />
            </FormField>
            <FormAlert message={create.error ? getErrorMessage(create.error) : null} />
            <Button type="submit" variant="danger" loading={create.isPending} disabled={!canSubmit}>
              Şikâyeti Gönder
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}
