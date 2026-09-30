'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime, formatTRY } from '@/lib/utils/format';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Pagination } from '@/components/shared/Pagination';
import { Toast, useToast } from '@/components/shared/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, inputClass } from '@/components/ui/FormField';
import {
  useAdminDeposits,
  useAdminLedger,
  useAdminWithdrawals,
  useApproveDeposit,
  useMarkWithdrawalPaid,
  useRejectDeposit,
  useRejectWithdrawal,
} from '../hooks/useWallet';
import {
  approveDepositSchema,
  ApproveDepositValues,
  financeRejectSchema,
  FinanceRejectValues,
  markPaidSchema,
  MarkPaidValues,
} from '../schemas/wallet.schema';
import { DEPOSIT_STATUS, TRANSACTION_LABELS, WITHDRAWAL_STATUS } from '../constants';
import { DepositRequest, WalletTransactionType, WithdrawalRequest } from '../types';
import AdminPaymentsTab from '@/features/payments/components/AdminPaymentsTab';

type Tab = 'withdrawals' | 'deposits' | 'online' | 'ledger';
type Notify = (msg: string, ok: boolean) => void;

const selectClass = 'px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs text-white focus:outline-none focus:border-[#38bdf8]';

/** Arama + durum filtresi (Enter ile uygulanır) */
function Filters({
  statuses,
  status,
  onStatus,
  onSearch,
  placeholder,
}: {
  statuses: [string, string][];
  status: string;
  onStatus: (v: string) => void;
  onSearch: (v: string) => void;
  placeholder: string;
}) {
  const [text, setText] = useState('');
  return (
    <form
      className="flex flex-col sm:flex-row gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(text.trim());
      }}
    >
      <select value={status} onChange={(e) => onStatus(e.target.value)} className={selectClass} aria-label="Durum">
        {statuses.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input value={text} onChange={(e) => setText(e.target.value)} maxLength={100} placeholder={placeholder} className={`${selectClass} flex-1`} />
      <button type="submit" className="px-4 py-2 rounded-xl bg-[#161824] border border-[#222534] text-white text-xs font-bold">
        Ara
      </button>
    </form>
  );
}

function RejectModal({ title, loading, onSubmit, onClose }: { title: string; loading: boolean; onSubmit: (reason: string) => void; onClose: () => void }) {
  const { register, handleSubmit, formState } = useForm<FinanceRejectValues>({ resolver: zodResolver(financeRejectSchema) });
  return (
    <Modal open onClose={() => !loading && onClose()} title={title}>
      <form onSubmit={handleSubmit(({ reason }) => onSubmit(reason))} className="flex flex-col gap-4">
        <FormField label="Gerekçe (kullanıcıya iletilir)" error={formState.errors.reason?.message}>
          <textarea rows={3} maxLength={500} className={inputClass} {...register('reason')} />
        </FormField>
        <Button type="submit" variant="danger" loading={loading}>
          Reddet
        </Button>
      </form>
    </Modal>
  );
}

// ─── Para çekme talepleri ────────────────────────────────────────────────────────
function WithdrawalsTab({ notify }: { notify: Notify }) {
  const [params, setParams] = useState({ page: 1, status: 'PENDING', search: '' });
  const list = useAdminWithdrawals({ page: params.page, status: params.status || undefined, search: params.search || undefined });
  const markPaid = useMarkWithdrawalPaid();
  const reject = useRejectWithdrawal();
  const [paying, setPaying] = useState<WithdrawalRequest | null>(null);
  const [rejecting, setRejecting] = useState<WithdrawalRequest | null>(null);
  const paidForm = useForm<MarkPaidValues>({ resolver: zodResolver(markPaidSchema) });

  const submitPaid = paidForm.handleSubmit(async ({ transferRef }) => {
    if (!paying) return;
    try {
      await markPaid.mutateAsync({ id: paying.id, transferRef });
      notify('Talep ödendi olarak işaretlendi.', true);
      setPaying(null);
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  });

  const submitReject = async (reason: string) => {
    if (!rejecting) return;
    try {
      await reject.mutateAsync({ id: rejecting.id, reason });
      notify('Talep reddedildi, tutar kullanıcıya iade edildi.', true);
      setRejecting(null);
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Filters
        statuses={[['PENDING', 'Bekleyen'], ['PAID', 'Ödenen'], ['REJECTED', 'Reddedilen'], ['CANCELLED', 'İptal'], ['', 'Tümü']]}
        status={params.status}
        onStatus={(status) => setParams({ ...params, status, page: 1 })}
        onSearch={(search) => setParams({ ...params, search, page: 1 })}
        placeholder="E-posta, ad veya hesap sahibi"
      />
      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState message={getErrorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState icon="task_alt" title="Bu listede talep yok" />
      ) : (
        <div className="bg-[#10121a] rounded-2xl border border-[#1c1f2b] divide-y divide-[#1c1f2b]">
          {list.data.items.map((w) => (
            <div key={w.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-black text-base text-white">{formatTRY(w.netAmount)}</span>
                  {w.fee > 0 && <span className="text-[11px] text-[#64748b]">gönderilecek ({formatTRY(w.amount)} − {formatTRY(w.fee)} ücret)</span>}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${WITHDRAWAL_STATUS[w.status].className}`}>{WITHDRAWAL_STATUS[w.status].label}</span>
                </div>
                <div className="text-xs text-[#94a3b8]">
                  {w.user?.name} · {w.user?.email}
                </div>
                <div className="text-xs font-mono text-white">
                  {w.iban} · {w.accountHolder}
                </div>
                <div className="text-[11px] text-[#64748b]">
                  {formatDateTime(w.createdAt)}
                  {w.transferRef ? ` · Ref: ${w.transferRef}` : ''}
                  {w.adminNote ? ` · ${w.adminNote}` : ''}
                </div>
              </div>
              {w.status === 'PENDING' && (
                <div className="flex gap-2 shrink-0">
                  <Button variant="danger" onClick={() => setRejecting(w)}>
                    Reddet
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => {
                      paidForm.reset({ transferRef: '' });
                      setPaying(w);
                    }}
                  >
                    Ödendi
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {list.data && <Pagination page={list.data.meta.page} totalPages={list.data.meta.totalPages} onChange={(page) => setParams({ ...params, page })} />}

      <Modal open={!!paying} onClose={() => !markPaid.isPending && setPaying(null)} title="Ödemeyi Onayla">
        {paying && (
          <form onSubmit={submitPaid} className="flex flex-col gap-4">
            <p className="text-xs text-[#94a3b8]">
              <strong className="text-white">{formatTRY(paying.netAmount)}</strong>
              {paying.fee > 0 ? ` (${formatTRY(paying.amount)} talep − ${formatTRY(paying.fee)} ücret)` : ''} tutarını <span className="font-mono text-white">{paying.iban}</span> ({paying.accountHolder}) hesabına gönderdikten sonra banka
              referansını giriniz. Hesap sahibinin kullanıcıyla aynı kişi olduğunu doğrulayınız.
            </p>
            <FormField label="Banka transfer referansı" error={paidForm.formState.errors.transferRef?.message}>
              <input className={inputClass} maxLength={100} {...paidForm.register('transferRef')} />
            </FormField>
            <Button type="submit" variant="success" loading={markPaid.isPending}>
              Ödendi Olarak İşaretle
            </Button>
          </form>
        )}
      </Modal>
      {rejecting && <RejectModal title="Para Çekme Talebini Reddet" loading={reject.isPending} onSubmit={submitReject} onClose={() => setRejecting(null)} />}
    </div>
  );
}

// ─── Havale/EFT ve kripto yükleme talepleri ───────────────────────────────────────
function DepositsTab({ notify }: { notify: Notify }) {
  const [params, setParams] = useState({ page: 1, status: 'PENDING', search: '' });
  const list = useAdminDeposits({ page: params.page, status: params.status || undefined, search: params.search || undefined });
  const approve = useApproveDeposit();
  const reject = useRejectDeposit();
  const [approving, setApproving] = useState<DepositRequest | null>(null);
  const [rejecting, setRejecting] = useState<DepositRequest | null>(null);
  const approveForm = useForm<ApproveDepositValues>({ resolver: zodResolver(approveDepositSchema) });

  const submitApprove = approveForm.handleSubmit(async ({ approvedAmount }) => {
    if (!approving) return;
    try {
      await approve.mutateAsync({ id: approving.id, approvedAmount });
      notify(`${formatTRY(approvedAmount)} kullanıcının bakiyesine yüklendi.`, true);
      setApproving(null);
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  });

  const submitReject = async (reason: string) => {
    if (!rejecting) return;
    try {
      await reject.mutateAsync({ id: rejecting.id, reason });
      notify('Yükleme talebi reddedildi.', true);
      setRejecting(null);
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Filters
        statuses={[['PENDING', 'Bekleyen'], ['APPROVED', 'Onaylanan'], ['REJECTED', 'Reddedilen'], ['CANCELLED', 'İptal'], ['', 'Tümü']]}
        status={params.status}
        onStatus={(status) => setParams({ ...params, status, page: 1 })}
        onSearch={(search) => setParams({ ...params, search, page: 1 })}
        placeholder="Referans kodu, gönderen, TX hash veya e-posta"
      />
      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState message={getErrorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState icon="task_alt" title="Bu listede talep yok" />
      ) : (
        <div className="bg-[#10121a] rounded-2xl border border-[#1c1f2b] divide-y divide-[#1c1f2b]">
          {list.data.items.map((d) => (
            <div key={d.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#1f2438] text-[#38bdf8] border border-[#263150]">{d.method === 'CRYPTO' ? 'KRİPTO' : 'HAVALE'}</span>
                  <span className="font-mono font-bold text-sm text-[#38bdf8]">{d.referenceCode}</span>
                  <span className="font-display font-black text-base text-white">{formatTRY(d.approvedAmount ?? d.amount)}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${DEPOSIT_STATUS[d.status].className}`}>{DEPOSIT_STATUS[d.status].label}</span>
                </div>
                <div className="text-xs text-[#94a3b8] break-all">
                  {d.method === 'CRYPTO' ? (
                    <>
                      Ağ: <strong className="text-white">{d.network}</strong> · TX: <code className="text-white">{d.txHash}</code>
                    </>
                  ) : (
                    <>
                      Gönderen: <strong className="text-white">{d.senderName}</strong>
                    </>
                  )}{' '}
                  · {d.user?.name} ({d.user?.email})
                </div>
                <div className="text-[11px] text-[#64748b]">
                  {formatDateTime(d.createdAt)}
                  {d.adminNote ? ` · ${d.adminNote}` : ''}
                </div>
              </div>
              {d.status === 'PENDING' && (
                <div className="flex gap-2 shrink-0">
                  <Button variant="danger" onClick={() => setRejecting(d)}>
                    Reddet
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => {
                      approveForm.reset({ approvedAmount: d.amount });
                      setApproving(d);
                    }}
                  >
                    Onayla
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {list.data && <Pagination page={list.data.meta.page} totalPages={list.data.meta.totalPages} onChange={(page) => setParams({ ...params, page })} />}

      <Modal open={!!approving} onClose={() => !approve.isPending && setApproving(null)} title={approving?.method === 'CRYPTO' ? 'Kripto Yüklemeyi Onayla' : 'Havaleyi Onayla'}>
        {approving && (
          <form onSubmit={submitApprove} className="flex flex-col gap-4">
            {approving.method === 'CRYPTO' ? (
              <p className="text-xs text-[#94a3b8] break-all">
                <strong className="text-white">{approving.network}</strong> ağında <code className="text-white">{approving.txHash}</code> işleminin platform adresine
                ulaştığını ve yeterli onay aldığını blok gezgininde doğrulayınız. Yüklenecek TL karşılığını onay anındaki kura göre giriniz.
              </p>
            ) : (
              <p className="text-xs text-[#94a3b8]">
                Banka hesabında <strong className="text-white">{approving.referenceCode}</strong> açıklamalı ve <strong className="text-white">{approving.senderName}</strong> adına
                gelen transferi doğrulayınız. Gelen tutar farklıysa gerçek tutarı giriniz.
              </p>
            )}
            <FormField label={approving.method === 'CRYPTO' ? 'Yüklenecek tutar (₺)' : 'Hesaba ulaşan tutar (₺)'} error={approveForm.formState.errors.approvedAmount?.message}>
              <input type="number" step="0.01" className={inputClass} {...approveForm.register('approvedAmount')} />
            </FormField>
            <Button type="submit" variant="success" loading={approve.isPending}>
              Onayla ve Bakiyeyi Yükle
            </Button>
          </form>
        )}
      </Modal>
      {rejecting && <RejectModal title="Yükleme Talebini Reddet" loading={reject.isPending} onSubmit={submitReject} onClose={() => setRejecting(null)} />}
    </div>
  );
}

// ─── Cüzdan defteri ──────────────────────────────────────────────────────────────
function LedgerTab() {
  const [params, setParams] = useState({ page: 1, status: '', search: '' });
  const list = useAdminLedger({ page: params.page, type: params.status || undefined, search: params.search || undefined });
  const typeOptions: [string, string][] = [['', 'Tüm hareketler'], ...Object.entries(TRANSACTION_LABELS).map(([k, v]) => [k, v.label] as [string, string])];

  return (
    <div className="flex flex-col gap-4">
      <Filters
        statuses={typeOptions}
        status={params.status}
        onStatus={(status) => setParams({ ...params, status, page: 1 })}
        onSearch={(search) => setParams({ ...params, search, page: 1 })}
        placeholder="E-posta veya açıklama"
      />
      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState message={getErrorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : (
        <div className="bg-[#10121a] rounded-2xl border border-[#1c1f2b] overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1c1f2b] text-[#64748b]">
                <th className="text-left px-4 py-3">Tarih</th>
                <th className="text-left px-4 py-3">Kullanıcı</th>
                <th className="text-left px-4 py-3">Tür</th>
                <th className="text-left px-4 py-3">Açıklama</th>
                <th className="text-right px-4 py-3">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1f2b]">
              {list.data.items.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2.5 text-[#94a3b8] whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                  <td className="px-4 py-2.5 text-white">{t.user.email}</td>
                  <td className="px-4 py-2.5 text-[#94a3b8] whitespace-nowrap">{TRANSACTION_LABELS[t.type as WalletTransactionType]?.label ?? t.type}</td>
                  <td className="px-4 py-2.5 text-[#64748b] max-w-[320px] truncate">{t.description}</td>
                  <td className={`px-4 py-2.5 text-right font-mono font-bold ${t.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {t.amount >= 0 ? '+' : '−'}
                    {formatTRY(Math.abs(t.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.data && <Pagination page={list.data.meta.page} totalPages={list.data.meta.totalPages} onChange={(page) => setParams({ ...params, page })} />}
    </div>
  );
}

export default function AdminFinanceView() {
  const [tab, setTab] = useState<Tab>('withdrawals');
  const { toast, show } = useToast();
  const notify: Notify = (msg, ok) => show(msg, ok ? 'success' : 'error');

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-4">
        <div>
          <h1 className="font-display font-extrabold text-xl text-white">Finans</h1>
          <p className="text-xs text-[#64748b] mt-1">Para çekme, havale/EFT ve kripto taleplerini banka ve blok zinciri hareketleriyle doğrulayarak sonuçlandırın; online ödemeleri izleyin.</p>
        </div>
        <div role="tablist" className="flex gap-2 overflow-x-auto">
          {(
            [
              ['withdrawals', 'Para Çekme Talepleri'],
              ['deposits', 'Havale & Kripto Talepleri'],
              ['online', 'Online Ödemeler'],
              ['ledger', 'Cüzdan Defteri'],
            ] as [Tab, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              type="button"
              onClick={() => setTab(value)}
              className={`px-4 py-2 rounded-lg text-xs font-bold border shrink-0 ${
                tab === value ? 'bg-[#2563eb] border-[#2563eb] text-white' : 'bg-[#090a0f] border-[#1c1f2b] text-[#94a3b8]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'withdrawals' && <WithdrawalsTab notify={notify} />}
      {tab === 'deposits' && <DepositsTab notify={notify} />}
      {tab === 'online' && <AdminPaymentsTab notify={notify} />}
      {tab === 'ledger' && <LedgerTab />}
      <Toast toast={toast} />
    </div>
  );
}
