'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime, formatTRY } from '@/lib/utils/format';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Pagination } from '@/components/shared/Pagination';
import { Toast, useToast } from '@/components/shared/Toast';
import { FormField, inputClass } from '@/components/ui/FormField';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { TopupPanel } from './TopupPanel';
import { WithdrawPanel } from './WithdrawPanel';
import { useTopup, useWalletSummary, useWalletTransactions } from '../hooks/useWallet';
import { topupSchema, TopupValues } from '../schemas/wallet.schema';
import { TOPUP_PRESETS, TRANSACTION_LABELS } from '../constants';

function TopupForm({ onDone }: { onDone: (msg: string, ok: boolean) => void }) {
  const topup = useTopup();
  const { register, handleSubmit, setValue, watch, formState } = useForm<TopupValues>({ resolver: zodResolver(topupSchema), defaultValues: { amount: 250 } });
  const amount = Number(watch('amount'));

  const submit = handleSubmit(async ({ amount }) => {
    try {
      await topup.mutateAsync(amount);
      onDone(`${formatTRY(amount)} cüzdanınıza eklendi.`, true);
    } catch (err) {
      onDone(getErrorMessage(err), false);
    }
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
        Test ortamı: gerçek ödeme alınmadan bakiye eklenir. Canlı ortamda bu alan ödeme sağlayıcısına bağlanmalıdır.
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TOPUP_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setValue('amount', p, { shouldValidate: true })}
            className={`p-4 rounded-xl font-display font-extrabold text-sm transition-all border ${amount === p ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-[#090a0f] text-white border-[#1c1f2b] hover:border-[#38bdf8]'}`}
          >
            {formatTRY(p)}
          </button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <FormField label="Tutar (₺)" error={formState.errors.amount?.message} className="flex-1">
          <input type="number" step="0.01" className={inputClass} {...register('amount')} />
        </FormField>
        <button type="submit" disabled={topup.isPending} className="px-7 py-3 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold disabled:opacity-50">
          {topup.isPending ? 'İşleniyor...' : 'Bakiye Yükle'}
        </button>
      </div>
    </form>
  );
}

type Tab = 'history' | 'deposit' | 'withdraw';

/** ?sekme=yukle | cek ile doğrudan ilgili sekme açılır */
const TAB_PARAM: Record<string, Tab> = { yukle: 'deposit', cek: 'withdraw' };

export default function WalletView() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(TAB_PARAM[searchParams.get('sekme') ?? ''] ?? 'history');
  const [page, setPage] = useState(1);
  const summary = useWalletSummary();
  const transactions = useWalletTransactions(page);
  const { toast, show } = useToast();
  const notify = (msg: string, ok: boolean) => show(msg, ok ? 'success' : 'error');
  const isSeller = !!user && (user.canSell || user.role === 'ADMIN');

  // iyzico dönüşünde ödeme kaydı bulunamazsa kullanıcı buraya yönlendirilir
  useEffect(() => {
    if (searchParams.get('odeme') === 'hata') show('Ödeme doğrulanamadı. Hesabınızdan çekim yapıldıysa destek ekibimizle iletişime geçiniz.', 'error');
  }, [searchParams, show]);

  if (summary.isPending) return <LoadingState label="Cüzdan yükleniyor..." />;
  if (summary.isError) return <ErrorState message={getErrorMessage(summary.error)} onRetry={() => summary.refetch()} />;

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] shadow-md">
        <div className="flex items-center gap-2 text-xs text-[#94a3b8] mb-1">
          <span className="material-symbols-outlined text-emerald-400 text-sm">account_balance_wallet</span>
          NexusPin Cüzdan
        </div>
        <div className="font-display font-black text-3xl sm:text-4xl text-white">{formatTRY(summary.data.walletBalance)}</div>
        {summary.data.pendingWithdrawal > 0 && (
          <div className="text-xs text-amber-300 mt-1">+ {formatTRY(summary.data.pendingWithdrawal)} para çekme talebinde bloke</div>
        )}
        <p className="text-xs text-[#94a3b8] mt-2">
          Satın alımlar cüzdan bakiyesiyle yapılır. Satış gelirleriniz, alıcı onayından sonra komisyon düşülerek bu bakiyeye aktarılır.
        </p>
      </div>

      <div role="tablist" className="flex gap-2 overflow-x-auto">
        {(
          [
            ['history', 'history', 'Hesap Hareketleri'],
            ['deposit', 'add_card', 'Bakiye Yükle'],
            ...(isSeller ? [['withdraw', 'account_balance', 'Para Çek']] : []),
          ] as [Tab, string, string][]
        ).map(([value, icon, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            type="button"
            onClick={() => setTab(value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border shrink-0 ${
              tab === value ? 'bg-[#2563eb] border-[#2563eb] text-white' : 'bg-[#10121a] border-[#1c1f2b] text-[#94a3b8] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {tab === 'deposit' && (
        <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] shadow-md flex flex-col gap-5">
          <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[#38bdf8]">add_card</span>
            Bakiye Yükle
          </h2>
          <TopupPanel notify={notify} />
          {summary.data.topupEnabled && (
            <div className="pt-5 border-t border-[#1c1f2b] flex flex-col gap-4">
              <h3 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Test Ortamı · Anında Yükleme</h3>
              <TopupForm onDone={notify} />
            </div>
          )}
        </div>
      )}

      {tab === 'withdraw' && isSeller && (
        <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] shadow-md flex flex-col gap-5">
          <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[#38bdf8]">payments</span>
            Kazancımı Banka Hesabıma Aktar
          </h2>
          <WithdrawPanel balance={summary.data.walletBalance} notify={notify} />
        </div>
      )}

      {tab === 'history' && (
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] shadow-md flex flex-col gap-4">
        <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-[#38bdf8]">history</span>
          Hesap Hareketleri
        </h2>
        {transactions.isPending ? (
          <p className="text-xs text-[#64748b] py-6 text-center">Yükleniyor...</p>
        ) : transactions.isError ? (
          <ErrorState message={getErrorMessage(transactions.error)} onRetry={() => transactions.refetch()} />
        ) : transactions.data.items.length === 0 ? (
          <p className="text-xs text-[#64748b] py-6 text-center">Henüz hesap hareketi bulunmuyor.</p>
        ) : (
          <div className="divide-y divide-[#1c1f2b]">
            {transactions.data.items.map((t) => {
              const cfg = TRANSACTION_LABELS[t.type];
              const positive = t.amount >= 0;
              return (
                <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#161a28] border border-[#232a40] text-[#38bdf8] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-base">{cfg.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white">{cfg.label}</div>
                      <div className="text-[11px] text-[#64748b] truncate">{t.description}</div>
                      <div className="text-[10px] text-[#475569]">{formatDateTime(t.createdAt)}</div>
                    </div>
                  </div>
                  <span className={`font-mono font-bold text-sm shrink-0 ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {positive ? '+' : '−'}
                    {formatTRY(Math.abs(t.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {transactions.data && <Pagination page={transactions.data.meta.page} totalPages={transactions.data.meta.totalPages} onChange={setPage} />}
      </div>
      )}
      <Toast toast={toast} />
    </div>
  );
}
