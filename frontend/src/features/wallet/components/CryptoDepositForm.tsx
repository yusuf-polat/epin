'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { formatTRY } from '@/lib/utils/format';
import { Button } from '@/components/ui/Button';
import { FormField, inputClass } from '@/components/ui/FormField';
import { walletLabel } from '@/features/payments/constants';
import { PaymentMethod } from '@/features/payments/types';
import { useCreateCryptoDeposit } from '../hooks/useWallet';
import { cryptoDepositSchema, CryptoDepositValues } from '../schemas/wallet.schema';
import { CopyRow } from './DepositPanel';

type Notify = (msg: string, ok: boolean) => void;

/**
 * Kripto ile yükleme: kullanıcı gösterilen adrese gönderim yapar ve işlem özetini bildirir;
 * finans ekibi işlemi blok zincirinde doğrulayınca TL karşılığı bakiyeye yüklenir.
 */
export function CryptoDepositForm({ method, notify }: { method: PaymentMethod; notify: Notify }) {
  const wallets = method.wallets ?? [];
  const create = useCreateCryptoDeposit();
  const [sent, setSent] = useState<string | null>(null);
  const { register, handleSubmit, watch, reset, formState } = useForm<CryptoDepositValues>({
    resolver: zodResolver(cryptoDepositSchema(method.minAmount, method.maxAmount)),
    defaultValues: { amount: Math.max(250, method.minAmount), network: wallets[0] ? walletLabel(wallets[0]) : '', txHash: '' },
  });
  const selected = wallets.find((w) => walletLabel(w) === watch('network'));

  const submit = handleSubmit(async (values) => {
    try {
      const deposit = await create.mutateAsync(values);
      setSent(deposit.referenceCode);
      reset({ ...values, txHash: '' });
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  });

  if (sent) {
    return (
      <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/30 flex flex-col gap-3">
        <div className="text-sm font-bold text-emerald-300">Bildiriminiz alındı ({sent})</div>
        <p className="text-xs text-[#94a3b8]">İşlem ağda doğrulandığında TL karşılığı bakiyenize yüklenecek ve bildirim alacaksınız.</p>
        <Button variant="secondary" onClick={() => setSent(null)}>
          Yeni Bildirim
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <ol className="p-4 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs text-[#94a3b8] list-decimal pl-8 flex flex-col gap-1">
        <li>Varlık ve ağı seçin, gösterilen adrese gönderim yapın. Yanlış ağa yapılan gönderimler kurtarılamaz.</li>
        <li>Gönderim tamamlanınca cüzdanınızdaki işlem özetini (TX hash) ve yüklenmesini beklediğiniz TL tutarını bildirin.</li>
        <li>Finans ekibi işlemi doğrulayınca bakiyeniz yüklenir.</li>
      </ol>
      {method.instructions && <p className="text-[11px] text-amber-200 whitespace-pre-line">{method.instructions}</p>}

      <FormField label="Varlık ve ağ" error={formState.errors.network?.message}>
        <select className={inputClass} {...register('network')}>
          {wallets.map((w) => (
            <option key={walletLabel(w)} value={walletLabel(w)}>
              {walletLabel(w)}
            </option>
          ))}
        </select>
      </FormField>
      {selected && (
        <div className="px-4 rounded-xl bg-[#090a0f] border border-[#1c1f2b]">
          <CopyRow label={`${selected.asset} gönderim adresi (${selected.network})`} value={selected.address} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label={`Yüklenecek tutar (${formatTRY(method.minAmount)} - ${formatTRY(method.maxAmount)})`} error={formState.errors.amount?.message}>
          <input type="number" step="0.01" className={inputClass} {...register('amount')} />
        </FormField>
        <FormField label="İşlem özeti (TX hash)" error={formState.errors.txHash?.message}>
          <input className={`${inputClass} font-mono`} maxLength={150} autoComplete="off" placeholder="0x... / işlem kimliği" {...register('txHash')} />
        </FormField>
      </div>
      <Button type="submit" loading={create.isPending}>
        Gönderimi Bildir
      </Button>
    </form>
  );
}
