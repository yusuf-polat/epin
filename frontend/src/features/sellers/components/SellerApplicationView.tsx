'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils/format';
import { FormAlert, FormField, inputClass } from '@/components/ui/FormField';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCreateSellerRequest, useMySellerRequests } from '../hooks/useSellerRequests';
import { sellerRequestSchema, SellerRequestValues } from '../schemas/seller-request.schema';
import { SELLER_REQUEST_STATUS } from '../constants';

const STEPS = [
  { icon: 'send', label: 'Başvuru', desc: 'Satmak istediğiniz ürünleri anlatın' },
  { icon: 'manage_search', label: 'İnceleme', desc: 'Ekibimiz başvurunuzu değerlendirir' },
  { icon: 'verified', label: 'Onay', desc: 'Mağazanızı açıp ilan verin' },
];

export default function SellerApplicationView() {
  const { user } = useAuth();
  const requests = useMySellerRequests();
  const create = useCreateSellerRequest();
  const { register, handleSubmit, reset, watch, formState } = useForm<SellerRequestValues>({ resolver: zodResolver(sellerRequestSchema) });
  const reason = watch('reason') ?? '';

  if (!user) return null;
  if (user.canSell || user.role === 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
        <span className="material-symbols-outlined text-5xl text-emerald-400">verified</span>
        <h1 className="font-display font-black text-2xl text-white">Satıcı Yetkiniz Mevcut</h1>
        <Link href={user.store ? '/hesabim/pazar' : '/hesabim/magazam/olustur'} className="px-6 py-3 rounded-xl bg-[#2563eb] text-white text-sm font-bold hover:bg-[#1d4ed8]">
          {user.store ? 'İlanlarıma Git' : 'Mağazamı Oluştur'}
        </Link>
      </div>
    );
  }

  const hasPending = requests.data?.some((r) => r.status === 'PENDING');
  const submit = handleSubmit(async ({ reason }) => {
    try {
      await create.mutateAsync(reason);
      reset({ reason: '' });
    } catch {
      // Hata aşağıda gösterilir
    }
  });

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-400">storefront</span>
          </div>
          <div>
            <h1 className="font-display font-extrabold text-xl text-white">Satıcı Başvurusu</h1>
            <p className="text-xs text-[#64748b]">Mağaza açmak ve ilan yayınlamak için onay gereklidir.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {STEPS.map((s) => (
            <div key={s.label} className="p-3 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-center">
              <span className="material-symbols-outlined text-2xl text-[#38bdf8] block mb-1">{s.icon}</span>
              <div className="text-xs font-bold text-white">{s.label}</div>
              <div className="text-[10px] text-[#64748b] mt-0.5">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {create.isSuccess && <FormAlert type="success" message="Başvurunuz alındı. Sonucu bildirim olarak alacaksınız." />}

      {hasPending ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-semibold">⏳ Bekleyen bir başvurunuz var, inceleme sürüyor.</div>
      ) : (
        <form onSubmit={submit} className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-4" noValidate>
          <h2 className="font-display font-bold text-base text-white">Yeni Başvuru</h2>
          <FormField label="Neden satıcı olmak istiyorsunuz?" error={formState.errors.reason?.message} hint={`${reason.length}/1000`}>
            <textarea rows={5} maxLength={1000} className={`${inputClass} text-sm resize-none`} placeholder="Satmayı planladığınız ürünleri ve deneyiminizi belirtiniz (en az 10 karakter)." {...register('reason')} />
          </FormField>
          <FormAlert message={create.error ? getErrorMessage(create.error) : null} />
          <button type="submit" disabled={formState.isSubmitting} className="py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-black">
            {formState.isSubmitting ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
          </button>
        </form>
      )}

      {!!requests.data?.length && (
        <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b]">
          <h2 className="font-display font-bold text-base text-white mb-4">Geçmiş Başvurularım</h2>
          <div className="flex flex-col gap-3">
            {requests.data.map((r) => (
              <div key={r.id} className="p-4 rounded-xl bg-[#090a0f] border border-[#1c1f2b]">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${SELLER_REQUEST_STATUS[r.status].className}`}>{SELLER_REQUEST_STATUS[r.status].label}</span>
                  <span className="text-[11px] text-[#64748b]">{formatDate(r.createdAt)}</span>
                </div>
                <p className="text-xs text-[#94a3b8] leading-relaxed whitespace-pre-line">{r.reason}</p>
                {r.adminNotes && <p className="mt-2 p-2 rounded-lg bg-[#131622] border border-[#1c1f2b] text-xs text-[#94a3b8]">Not: {r.adminNotes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
