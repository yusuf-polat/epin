'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { FormAlert, inputClass } from '@/components/ui/FormField';
import { useOrder } from '@/features/orders/hooks/useOrders';
import { useOpenDispute } from '../hooks/useDisputes';
import { openDisputeSchema, OpenDisputeValues } from '../schemas/dispute.schema';
import { DISPUTE_REASON_OPTIONS, extractYoutubeId } from '../constants';

const VIDEO_RULES = [
  'Kayıt, NexusPin panelinde "Kodu Göster" butonuna basılmadan önce başlamış olmalı.',
  'Kod kopyalanıp aktivasyon ekranına yapıştırılana kadar kesinti veya montaj olmamalıdır.',
  'Ekrandaki sistem saati okunabilir olmalıdır.',
  'Video YouTube\'a "Liste Dışı (Unlisted)" olarak yüklenmelidir; yalnızca satıcı ve destek ekibi izleyebilir.',
];

export default function OpenDisputeForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const order = useOrder(orderId);
  const openDispute = useOpenDispute();
  const { register, handleSubmit, watch, setValue, formState } = useForm<OpenDisputeValues>({
    resolver: zodResolver(openDisputeSchema),
    defaultValues: { description: '', videoUrl: '' },
  });
  const [reason, videoUrl, description] = watch(['reason', 'videoUrl', 'description']);
  const videoId = extractYoutubeId(videoUrl ?? '');
  const errors = formState.errors;

  const onSubmit = handleSubmit(async ({ reason, description, videoUrl }) => {
    try {
      await openDispute.mutateAsync({ orderId, reason, description, videoUrl });
    } catch {
      return;
    }
    router.push('/hesabim/siparislerim');
  });

  if (order.isPending) return <LoadingState />;
  if (order.isError) return <ErrorState message={getErrorMessage(order.error, 'Sipariş bulunamadı')} />;

  const o = order.data;
  const canDispute = o.escrowStatus === 'HELD_IN_ESCROW' && o.deliveryStatus === 'DELIVERED' && (!o.dispute || o.dispute.status === 'CANCELLED');
  if (!canDispute) {
    return (
      <div className="bg-[#10121a] rounded-2xl p-10 border border-[#1c1f2b] flex flex-col items-center gap-4 text-center">
        <span className="material-symbols-outlined text-amber-400 text-4xl">info</span>
        <h2 className="text-white font-bold">Bu sipariş için itiraz açılamaz</h2>
        <p className="text-[#94a3b8] text-sm max-w-md">
          {o.deliveryStatus === 'PENDING'
            ? 'Sipariş henüz teslim edilmedi. Teslim süresi dolarsa siparişi iptal edip iade alabilirsiniz.'
            : 'Siparişin ödemesi işlenmiş veya zaten aktif bir itiraz bulunuyor.'}
        </p>
        <Link href="/hesabim/siparislerim" className="text-[#38bdf8] text-sm hover:underline">
          ← Siparişlerime Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-red-400">report</span>
        </div>
        <div>
          <h1 className="font-display font-extrabold text-xl text-white">Video Kanıtlı İtiraz</h1>
          <p className="text-xs text-[#64748b]">
            Sipariş <span className="font-mono text-[#94a3b8]">#{o.orderNumber}</span>
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        <div className="bg-[#10121a] rounded-2xl p-6 border border-amber-500/30">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-amber-400">videocam</span>
            <h2 className="font-display font-bold text-base text-white">Video Kanıt Kuralları (Zorunlu)</h2>
          </div>
          <div className="flex flex-col gap-3">
            {VIDEO_RULES.map((rule) => (
              <div key={rule} className="flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-400 text-base mt-0.5">check_circle</span>
                <span className="text-sm text-[#94a3b8]">{rule}</span>
              </div>
            ))}
          </div>
        </div>

        <fieldset className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b]">
          <legend className="font-display font-bold text-base text-white mb-4">Sorun Kategorisi</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DISPUTE_REASON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={reason === opt.value}
                onClick={() => setValue('reason', opt.value, { shouldValidate: true })}
                className={`text-left p-4 rounded-xl border transition-all ${
                  reason === opt.value ? 'bg-[#2563eb]/10 border-[#2563eb] text-white' : 'bg-[#090a0f] border-[#1c1f2b] text-[#94a3b8] hover:border-[#2563eb]/50'
                }`}
              >
                <div className="font-semibold text-sm mb-1">{opt.label}</div>
                <div className="text-xs opacity-70">{opt.desc}</div>
              </button>
            ))}
          </div>
          {errors.reason && <p className="text-[11px] text-rose-400 mt-2">{errors.reason.message}</p>}
        </fieldset>

        <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b]">
          <h2 className="font-display font-bold text-base text-white mb-4">Detaylı Açıklama</h2>
          <textarea
            className={`${inputClass} text-sm resize-none`}
            rows={5}
            maxLength={2000}
            placeholder="Kodu ne zaman denediğinizi ve hangi hata mesajını aldığınızı belirtin (en az 20 karakter)"
            {...register('description')}
          />
          <div className="flex justify-between text-xs mt-1">
            <span className="text-rose-400">{errors.description?.message}</span>
            <span className="text-[#64748b]">{description?.length ?? 0}/2000</span>
          </div>
        </div>

        <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b]">
          <h2 className="font-display font-bold text-base text-white mb-2">YouTube Video Kanıtı</h2>
          <input type="url" className={`${inputClass} text-sm`} placeholder="https://www.youtube.com/watch?v=... veya https://youtu.be/..." {...register('videoUrl')} />
          {errors.videoUrl && <p className="text-xs text-red-400 mt-2">{errors.videoUrl.message}</p>}
          {videoId && (
            <div className="mt-4 rounded-xl overflow-hidden border border-[#1c1f2b] aspect-video">
              <iframe className="w-full h-full" src={`https://www.youtube-nocookie.com/embed/${videoId}`} allow="encrypted-media; picture-in-picture" allowFullScreen title="Video önizleme" />
            </div>
          )}
        </div>

        <label className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-0.5 w-4 h-4 accent-[#2563eb]" {...register('agreed')} />
          <span className="text-sm text-[#94a3b8]">
            Videonun <strong className="text-white">kesintisiz ve manipülasyon içermediğini</strong>, aksi tespit edilirse itirazımın geçersiz sayılacağını kabul ediyorum.
            {errors.agreed && <span className="block text-rose-400 text-xs mt-1">{errors.agreed.message}</span>}
          </span>
        </label>

        <FormAlert message={openDispute.error ? getErrorMessage(openDispute.error, 'İtiraz açılırken bir hata oluştu.') : null} />

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/hesabim/siparislerim" className="flex-1 py-3 rounded-xl border border-[#1c1f2b] text-[#94a3b8] text-sm font-semibold text-center hover:bg-[#1c1f2b]">
            Vazgeç
          </Link>
          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">gavel</span>
            {formState.isSubmitting ? 'İşleniyor...' : 'İtirazı Başlat ve Ödemeyi Dondur'}
          </button>
        </div>
      </form>
    </div>
  );
}
