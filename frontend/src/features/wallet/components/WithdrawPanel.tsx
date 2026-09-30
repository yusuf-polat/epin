'use client';

import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime, formatTRY } from '@/lib/utils/format';
import { formatIbanInput } from '@/lib/utils/iban';
import { Pagination } from '@/components/shared/Pagination';
import { Button } from '@/components/ui/Button';
import { FormField, inputClass } from '@/components/ui/FormField';
import { useCancelWithdrawal, useCreateWithdrawal, useMyWithdrawals } from '../hooks/useWallet';
import { WithdrawalFormInput, withdrawalSchema, WithdrawalValues } from '../schemas/wallet.schema';
import { MIN_WITHDRAWAL, WITHDRAWAL_STATUS } from '../constants';
import { useCommissionSettings } from '@/features/settings/hooks/useSettings';
import { withdrawalFee } from '@/features/settings/schemas/settings.schema';

type Notify = (msg: string, ok: boolean) => void;

export function WithdrawPanel({ balance, notify }: { balance: number; notify: Notify }) {
  const [page, setPage] = useState(1);
  const withdrawals = useMyWithdrawals(page);
  const create = useCreateWithdrawal();
  const cancel = useCancelWithdrawal();
  const commission = useCommissionSettings();
  const { register, handleSubmit, control, setValue, reset, watch, formState } = useForm<WithdrawalFormInput>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: { amount: '' as unknown as number, iban: '', accountHolder: '' },
  });

  const amount = Number(watch('amount')) || 0;
  const fees = commission.data ?? { withdrawalPercent: 0, withdrawalFixed: 0 };
  const hasFee = fees.withdrawalPercent > 0 || fees.withdrawalFixed > 0;
  const fee = amount > 0 ? withdrawalFee(amount, fees) : 0;

  const submit = handleSubmit(async (raw) => {
    const values = withdrawalSchema.parse(raw) as WithdrawalValues;
    if (values.amount > balance) {
      notify('Çekmek istediğiniz tutar bakiyenizden fazla.', false);
      return;
    }
    try {
      await create.mutateAsync(values);
      notify(`${formatTRY(values.amount)} için para çekme talebiniz alındı.`, true);
      reset({ amount: '' as unknown as number, iban: values.iban, accountHolder: values.accountHolder });
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  });

  const onCancel = async (id: string) => {
    try {
      await cancel.mutateAsync(id);
      notify('Talep iptal edildi, tutar bakiyenize iade edildi.', true);
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs text-[#94a3b8]">
        Talep oluşturduğunuzda tutar bakiyenizden bloke edilir ve finans ekibimiz 1-2 iş günü içinde <strong className="text-white">adınıza kayıtlı</strong> banka hesabına
        gönderir. Reddedilen veya iptal edilen taleplerde tutar bakiyenize iade edilir. En az {formatTRY(MIN_WITHDRAWAL)} çekilebilir.
        {hasFee && (
          <>
            {' '}
            Para çekme ücreti:{' '}
            <strong className="text-white">
              {[fees.withdrawalPercent ? `%${fees.withdrawalPercent}` : null, fees.withdrawalFixed ? formatTRY(fees.withdrawalFixed) : null].filter(Boolean).join(' + ')}
            </strong>
            .
          </>
        )}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Tutar (₺)" error={formState.errors.amount?.message} hint={`Çekilebilir: ${formatTRY(balance)}`}>
            <div className="flex gap-2">
              <input type="number" step="0.01" className={inputClass} {...register('amount')} />
              <button
                type="button"
                onClick={() => setValue('amount', balance, { shouldValidate: true })}
                className="px-3 rounded-xl bg-[#161824] border border-[#222534] text-[11px] font-bold text-[#38bdf8] shrink-0"
              >
                Tümü
              </button>
            </div>
          </FormField>
          <FormField label="Hesap sahibi" error={formState.errors.accountHolder?.message}>
            <input className={inputClass} maxLength={120} autoComplete="name" {...register('accountHolder')} />
          </FormField>
        </div>
        <Controller
          control={control}
          name="iban"
          render={({ field, fieldState }) => (
            <FormField label="IBAN" error={fieldState.error?.message}>
              <input
                className={`${inputClass} font-mono tracking-wider`}
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                value={formatIbanInput(field.value)}
                onChange={(e) => field.onChange(formatIbanInput(e.target.value))}
                onBlur={field.onBlur}
                inputMode="text"
                autoComplete="off"
              />
            </FormField>
          )}
        />
        {hasFee && amount > 0 && (
          <div className="p-3 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs flex flex-col gap-1">
            <div className="flex justify-between text-[#94a3b8]">
              <span>Bakiyeden düşülecek</span>
              <span className="font-mono text-white">{formatTRY(amount)}</span>
            </div>
            <div className="flex justify-between text-[#94a3b8]">
              <span>Para çekme ücreti</span>
              <span className="font-mono text-white">−{formatTRY(fee)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#1c1f2b] font-semibold text-white">
              <span>Hesabınıza gönderilecek</span>
              <span className="font-mono text-emerald-300">{formatTRY(Math.max(0, amount - fee))}</span>
            </div>
          </div>
        )}
        <Button type="submit" loading={create.isPending} disabled={balance < MIN_WITHDRAWAL}>
          Para Çekme Talebi Oluştur
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Çekim Taleplerim</h3>
        {withdrawals.data?.items.length ? (
          <div className="divide-y divide-[#1c1f2b]">
            {withdrawals.data.items.map((w) => (
              <div key={w.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-white">{w.iban}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${WITHDRAWAL_STATUS[w.status].className}`}>{WITHDRAWAL_STATUS[w.status].label}</span>
                  </div>
                  <div className="text-[11px] text-[#64748b]">
                    {formatDateTime(w.createdAt)}
                    {w.transferRef ? ` · Ref: ${w.transferRef}` : ''}
                    {w.status === 'REJECTED' && w.adminNote ? ` · ${w.adminNote}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-right">
                    <span className="block font-mono font-bold text-sm text-white">{formatTRY(w.netAmount)}</span>
                    {w.fee > 0 && <span className="block text-[10px] text-[#64748b]">{formatTRY(w.fee)} ücret</span>}
                  </span>
                  {w.status === 'PENDING' && (
                    <button type="button" disabled={cancel.isPending} onClick={() => onCancel(w.id)} className="text-[11px] font-bold text-rose-300 hover:underline">
                      İptal
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#64748b] py-3">Henüz para çekme talebiniz yok.</p>
        )}
        {withdrawals.data && <Pagination page={withdrawals.data.meta.page} totalPages={withdrawals.data.meta.totalPages} onChange={setPage} />}
      </div>
    </div>
  );
}
