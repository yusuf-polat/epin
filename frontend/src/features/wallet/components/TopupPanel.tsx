'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { formatTRY } from '@/lib/utils/format';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/Button';
import { FormField, inputClass } from '@/components/ui/FormField';
import { useCheckout, usePaymentMethods } from '@/features/payments/hooks/usePayments';
import { calculateFee, feeLabel, PROVIDER_META } from '@/features/payments/constants';
import { OnlineProvider, PaymentMethod } from '@/features/payments/types';
import { onlineTopupSchema, OnlineTopupValues } from '../schemas/wallet.schema';
import { AmountPresets, DepositPanel } from './DepositPanel';
import { CryptoDepositForm } from './CryptoDepositForm';
import { TopupHistory } from './TopupHistory';

type Notify = (msg: string, ok: boolean) => void;

/** Kart / kripto sağlayıcısıyla ödeme: sağlayıcı sayfasına yönlendirir veya gömülü formu açar */
function OnlineCheckoutForm({ method, notify }: { method: PaymentMethod; notify: Notify }) {
  const router = useRouter();
  const checkout = useCheckout();
  const [redirecting, setRedirecting] = useState(false);
  const { register, handleSubmit, setValue, watch, formState } = useForm<OnlineTopupValues>({
    resolver: zodResolver(onlineTopupSchema(method.minAmount, method.maxAmount)),
    defaultValues: { amount: Math.max(250, method.minAmount) },
  });
  const amount = Number(watch('amount')) || 0;
  const fee = calculateFee(amount, method);

  const submit = handleSubmit(async ({ amount }) => {
    try {
      const res = await checkout.mutateAsync({ provider: method.provider as OnlineProvider, amount });
      if (res.redirectUrl) {
        setRedirecting(true);
        window.location.assign(res.redirectUrl);
      } else {
        router.push(`/hesabim/cuzdan/odeme/${res.id}`);
      }
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <AmountPresets value={amount} min={method.minAmount} max={method.maxAmount} onPick={(p) => setValue('amount', p, { shouldValidate: true })} />
      <FormField label={`Yüklenecek tutar (${formatTRY(method.minAmount)} - ${formatTRY(method.maxAmount)})`} error={formState.errors.amount?.message}>
        <input type="number" step="0.01" className={inputClass} {...register('amount')} />
      </FormField>
      <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs flex flex-col gap-1.5">
        <div className="flex justify-between text-[#94a3b8]">
          <span>Cüzdana yüklenecek</span>
          <span className="font-mono text-white">{formatTRY(amount)}</span>
        </div>
        <div className="flex justify-between text-[#94a3b8]">
          <span>Hizmet bedeli</span>
          <span className="font-mono text-white">{formatTRY(fee)}</span>
        </div>
        <div className="flex justify-between pt-1.5 border-t border-[#1c1f2b] font-bold text-white">
          <span>Ödenecek</span>
          <span className="font-mono text-[#38bdf8]">{formatTRY(amount + fee)}</span>
        </div>
      </div>
      {method.testMode && (
        <p className="text-[11px] text-amber-300">Bu yöntem test modunda: gerçek kartınızdan çekim yapılmaz, sağlayıcının test kartlarını kullanınız.</p>
      )}
      <Button type="submit" loading={checkout.isPending || redirecting}>
        {redirecting ? 'Ödeme sayfasına yönlendiriliyorsunuz...' : `${formatTRY(amount + fee)} Öde`}
      </Button>
      <p className="text-[11px] text-[#64748b] text-center">
        Kart bilgileriniz {method.displayName} güvenli ödeme sayfasında işlenir; NexusPin kart bilgisi saklamaz.
      </p>
    </form>
  );
}

function MethodCard({ method, active, onSelect }: { method: PaymentMethod; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`text-left p-4 rounded-xl border transition-all flex flex-col gap-1 ${active ? 'bg-[#2563eb]/10 border-[#2563eb]' : 'bg-[#090a0f] border-[#1c1f2b] hover:border-[#2563eb]/50'}`}
    >
      <div className="flex items-center gap-2 font-bold text-sm text-white">
        <span className="material-symbols-outlined text-[#38bdf8]">{PROVIDER_META[method.provider].icon}</span>
        <span className="truncate">{method.displayName}</span>
        {method.testMode && <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">TEST</span>}
      </div>
      {method.description && <p className="text-[11px] text-[#94a3b8] line-clamp-2">{method.description}</p>}
      <span className="text-[10px] font-bold text-[#64748b] mt-auto">{method.kind === 'manual' ? 'Onaylı yükleme · ' : 'Anında · '}{feeLabel(method)}</span>
    </button>
  );
}

export function TopupPanel({ notify }: { notify: Notify }) {
  const methods = usePaymentMethods();
  const [selected, setSelected] = useState<string | null>(null);
  const list = methods.data ?? [];
  const method = list.find((m) => m.provider === selected) ?? null;

  // İlk açılışta ilk yöntem seçili gelir
  useEffect(() => {
    if (!selected && list.length) setSelected(list[0].provider);
  }, [list, selected]);

  if (methods.isError) return <ErrorState message={getErrorMessage(methods.error)} onRetry={() => methods.refetch()} />;

  return (
    <div className="flex flex-col gap-5">
      {methods.isPending ? (
        <p className="text-xs text-[#64748b]">Ödeme yöntemleri yükleniyor...</p>
      ) : list.length === 0 ? (
        <p className="text-xs text-[#94a3b8]">Şu anda kullanılabilir bir bakiye yükleme yöntemi yok. Lütfen destek ekibimizle iletişime geçiniz.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {list.map((m) => (
              <MethodCard key={m.provider} method={m} active={m.provider === selected} onSelect={() => setSelected(m.provider)} />
            ))}
          </div>
          {method && (
            <div key={method.provider} className="pt-5 border-t border-[#1c1f2b]">
              {method.provider === 'BANK_TRANSFER' ? (
                <DepositPanel notify={notify} min={method.minAmount} max={method.maxAmount} />
              ) : method.provider === 'CRYPTO_MANUAL' ? (
                <CryptoDepositForm method={method} notify={notify} />
              ) : (
                <OnlineCheckoutForm method={method} notify={notify} />
              )}
            </div>
          )}
        </>
      )}
      <div className="pt-5 border-t border-[#1c1f2b]">
        <TopupHistory notify={notify} />
      </div>
    </div>
  );
}
