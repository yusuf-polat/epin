'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { formatTRY } from '@/lib/utils/format';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Button } from '@/components/ui/Button';
import { FormField, inputClass } from '@/components/ui/FormField';
import { useBankInfo, useCreateDeposit } from '../hooks/useWallet';
import { depositSchema, DepositValues } from '../schemas/wallet.schema';
import { TOPUP_PRESETS } from '../constants';
import { CreatedDeposit } from '../types';

type Notify = (msg: string, ok: boolean) => void;

export function CopyRow({ label, value }: { label: string; value: string }) {
  const { copiedKey, copy } = useCopyToClipboard();
  const copied = copiedKey === value;
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-[#64748b] font-bold">{label}</div>
        <div className="text-sm font-mono text-white break-all">{value}</div>
      </div>
      <button type="button" onClick={() => void copy(value)} className="px-2.5 py-1 rounded-lg bg-[#161824] border border-[#222534] text-[11px] font-bold text-[#38bdf8] shrink-0">
        {copied ? 'Kopyalandı' : 'Kopyala'}
      </button>
    </div>
  );
}

/** Tutar kısayolları (yalnızca yöntemin sınırları içindekiler) */
export function AmountPresets({ value, min, max, onPick }: { value: number; min: number; max: number; onPick: (v: number) => void }) {
  const presets = TOPUP_PRESETS.filter((p) => p >= min && p <= max);
  if (!presets.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {presets.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPick(p)}
          className={`p-3 rounded-xl font-display font-extrabold text-sm border ${value === p ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-[#090a0f] text-white border-[#1c1f2b] hover:border-[#38bdf8]'}`}
        >
          {formatTRY(p)}
        </button>
      ))}
    </div>
  );
}

/** Talep oluşturulduktan sonra gösterilen havale talimatı */
function TransferInstructions({ deposit, onClose }: { deposit: CreatedDeposit; onClose: () => void }) {
  return (
    <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/30 flex flex-col gap-3">
      <div className="text-sm font-bold text-emerald-300">Talebiniz oluşturuldu — şimdi havale/EFT yapınız</div>
      <div className="divide-y divide-[#1c1f2b]">
        <CopyRow label="Banka" value={deposit.bankAccount.bankName} />
        <CopyRow label="Alıcı" value={deposit.bankAccount.accountHolder} />
        <CopyRow label="IBAN" value={deposit.bankAccount.iban} />
        <CopyRow label="Tutar" value={formatTRY(deposit.amount)} />
        <CopyRow label="Açıklama (zorunlu)" value={deposit.referenceCode} />
      </div>
      <p className="text-[11px] text-amber-200">
        Açıklama alanına yalnızca <strong>{deposit.referenceCode}</strong> yazınız. Gönderen hesap adı &quot;{deposit.senderName}&quot; ile eşleşmelidir; üçüncü kişi
        hesaplarından yapılan transferler iade edilir.
      </p>
      <Button variant="secondary" onClick={onClose}>
        Tamam
      </Button>
    </div>
  );
}

/** Havale/EFT ile yükleme: referans kodu alınır, finans ekibi transferi doğrulayınca bakiye yüklenir */
export function DepositPanel({ notify, min, max }: { notify: Notify; min: number; max: number }) {
  const [created, setCreated] = useState<CreatedDeposit | null>(null);
  const bank = useBankInfo(true);
  const create = useCreateDeposit();
  const { register, handleSubmit, setValue, watch, reset, formState } = useForm<DepositValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: { amount: Math.max(250, min), senderName: '' },
  });
  const amount = Number(watch('amount'));

  const submit = handleSubmit(async (values) => {
    if (values.amount < min || values.amount > max) {
      notify(`${formatTRY(min)} - ${formatTRY(max)} arası yükleme yapılabilir.`, false);
      return;
    }
    try {
      setCreated(await create.mutateAsync(values));
      reset({ amount: Math.max(250, min), senderName: values.senderName });
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  });

  return (
    <div className="flex flex-col gap-5">
      {bank.data && (
        <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs text-[#94a3b8]">
          <strong className="text-white">Nasıl çalışır?</strong> Tutarı ve gönderen hesap sahibini girin, size özel referans kodunu alın ve{' '}
          <strong className="text-white">{bank.data.bankName}</strong> hesabımıza havale/EFT yapın. Transfer doğrulanınca bakiyeniz yüklenir (mesai saatlerinde
          genellikle 30 dakika içinde).
        </div>
      )}

      {created ? (
        <TransferInstructions deposit={created} onClose={() => setCreated(null)} />
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <AmountPresets value={amount} min={min} max={max} onPick={(p) => setValue('amount', p, { shouldValidate: true })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={`Tutar (₺${min} - ₺${max.toLocaleString('tr-TR')})`} error={formState.errors.amount?.message}>
              <input type="number" step="0.01" className={inputClass} {...register('amount')} />
            </FormField>
            <FormField label="Gönderen hesap sahibi" error={formState.errors.senderName?.message} hint="Havaleyi yapacağınız hesabın adı soyadı">
              <input className={inputClass} maxLength={120} autoComplete="name" {...register('senderName')} />
            </FormField>
          </div>
          <Button type="submit" loading={create.isPending}>
            Referans Kodu Al
          </Button>
        </form>
      )}
    </div>
  );
}
