'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { formatDate, formatTRY } from '@/lib/utils/format';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Pagination } from '@/components/shared/Pagination';
import { Toast, useToast } from '@/components/shared/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, inputClass } from '@/components/ui/FormField';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { Role } from '@/features/auth/types';
import { useAdminAdjustBalance } from '@/features/wallet/hooks/useWallet';
import { adminAdjustSchema, AdminAdjustValues } from '@/features/wallet/schemas/wallet.schema';
import { useResolveSellerRequest, useSellerRequestsAdmin } from '@/features/sellers/hooks/useSellerRequests';
import { resolveSellerRequestSchema, ResolveSellerRequestValues } from '@/features/sellers/schemas/seller-request.schema';
import type { SellerRequest } from '@/features/sellers/types';
import { useAdminUsers, useBanUser, useSetSellerPermission, useSetUserRole, useUnbanUser } from '../hooks/useUsers';
import { banSchema, BanValues } from '../schemas/user.schema';
import type { AdminUserRow } from '../types';

type Notify = (msg: string, ok: boolean) => void;

function BanModal({ user, onClose, notify }: { user: AdminUserRow; onClose: () => void; notify: Notify }) {
  const ban = useBanUser();
  const { register, handleSubmit, formState } = useForm<BanValues>({ resolver: zodResolver(banSchema) });
  const submit = handleSubmit(async ({ reason }) => {
    try {
      await ban.mutateAsync({ id: user.id, reason });
      notify('Hesap askıya alındı.', true);
      onClose();
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  });
  return (
    <Modal open onClose={() => !ban.isPending && onClose()} title="Hesabı Askıya Al">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-xs text-[#94a3b8]">
          {user.name} ({user.email})
        </p>
        <FormField label="Gerekçe (kullanıcıya iletilir)" error={formState.errors.reason?.message}>
          <textarea rows={3} maxLength={500} className={inputClass} {...register('reason')} />
        </FormField>
        <Button type="submit" variant="danger" loading={ban.isPending}>
          Askıya Al
        </Button>
      </form>
    </Modal>
  );
}

function WalletModal({ user, onClose, notify }: { user: AdminUserRow; onClose: () => void; notify: Notify }) {
  const adjust = useAdminAdjustBalance();
  const { register, handleSubmit, formState } = useForm<AdminAdjustValues>({ resolver: zodResolver(adminAdjustSchema) });
  const submit = handleSubmit(async (v) => {
    try {
      await adjust.mutateAsync({ userId: user.id, amount: v.amount, note: v.note });
      notify('Bakiye güncellendi.', true);
      onClose();
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  });
  return (
    <Modal open onClose={() => !adjust.isPending && onClose()} title="Bakiye Düzenle">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-xs text-[#94a3b8]">
          {user.name} · Mevcut bakiye: <strong className="text-white">{formatTRY(user.walletBalance)}</strong>
        </p>
        <FormField label="Tutar (+ ekler, − düşer)" error={formState.errors.amount?.message}>
          <input type="number" step="0.01" className={inputClass} {...register('amount')} />
        </FormField>
        <FormField label="Açıklama" error={formState.errors.note?.message} hint="Kullanıcının hesap hareketlerine kaydedilir ve kullanıcıya bildirilir.">
          <input maxLength={300} className={inputClass} placeholder="Ör. havale ile yükleme, dekont no" {...register('note')} />
        </FormField>
        <Button type="submit" loading={adjust.isPending}>
          Uygula
        </Button>
      </form>
    </Modal>
  );
}

function ResolveRequestModal({ request, action, onClose, notify }: { request: SellerRequest; action: 'APPROVED' | 'REJECTED'; onClose: () => void; notify: Notify }) {
  const resolve = useResolveSellerRequest();
  const { register, handleSubmit } = useForm<ResolveSellerRequestValues>({ resolver: zodResolver(resolveSellerRequestSchema) });
  const approved = action === 'APPROVED';
  const submit = handleSubmit(async ({ adminNotes }) => {
    try {
      await resolve.mutateAsync({ id: request.id, action, adminNotes: adminNotes || undefined });
      notify(approved ? 'Başvuru onaylandı.' : 'Başvuru reddedildi.', true);
      onClose();
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  });
  return (
    <Modal open onClose={() => !resolve.isPending && onClose()} title={approved ? 'Başvuruyu Onayla' : 'Başvuruyu Reddet'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-xs text-[#94a3b8]">{request.user?.name}</p>
        <FormField label="Not (isteğe bağlı, kullanıcıya iletilir)">
          <textarea rows={3} maxLength={500} className={inputClass} {...register('adminNotes')} />
        </FormField>
        <Button type="submit" variant={approved ? 'success' : 'danger'} loading={resolve.isPending}>
          {approved ? 'Onayla' : 'Reddet'}
        </Button>
      </form>
    </Modal>
  );
}

function UsersTable({ notify }: { notify: Notify }) {
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState<string | undefined>();
  const users = useAdminUsers({ page, search });
  const setRole = useSetUserRole();
  const setSeller = useSetSellerPermission();
  const unban = useUnbanUser();
  const [modal, setModal] = useState<{ kind: 'ban' | 'wallet'; user: AdminUserRow } | null>(null);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      notify(ok, true);
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  };

  if (users.isPending) return <LoadingState />;
  if (users.isError) return <ErrorState message={getErrorMessage(users.error)} onRetry={() => users.refetch()} />;

  return (
    <div className="bg-[#10121a] rounded-2xl border border-[#1c1f2b] overflow-hidden">
      <form
        className="p-4 border-b border-[#1c1f2b] flex gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(searchInput.trim() || undefined);
        }}
      >
        <input className={inputClass} value={searchInput} maxLength={100} onChange={(e) => setSearchInput(e.target.value)} placeholder="İsim veya e-posta ara..." />
        <button type="submit" className="px-4 rounded-xl bg-[#2563eb] text-white text-xs font-bold">
          Ara
        </button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1c1f2b] text-[#64748b]">
              <th className="text-left px-4 py-3">Kullanıcı</th>
              <th className="text-left px-4 py-3">Mağaza</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="text-center px-4 py-3">Satıcı</th>
              <th className="text-right px-4 py-3">Bakiye</th>
              <th className="text-right px-4 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c1f2b]">
            {users.data.items.map((u) => {
              const self = u.id === me?.id;
              return (
                <tr key={u.id} className={u.isBanned ? 'bg-red-500/5' : ''}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      {u.name}
                      {u.isBanned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">ASKIDA</span>}
                    </div>
                    <div className="text-[#64748b] text-[11px]">{u.email}</div>
                    <div className="text-[#475569] text-[10px]">Kayıt: {formatDate(u.createdAt)}</div>
                    {u.isBanned && u.banReason && <div className="text-[11px] text-red-400/90">Sebep: {u.banReason}</div>}
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8]">{u.store ? `${u.store.name}${u.store.isActive ? '' : ' (askıda)'}` : '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      aria-label="Rol"
                      value={u.role}
                      disabled={self || setRole.isPending}
                      onChange={(e) => run(() => setRole.mutateAsync({ id: u.id, role: e.target.value as Role }), 'Rol güncellendi.')}
                      className="bg-[#090a0f] border border-[#1c1f2b] rounded-lg px-2 py-1 text-white disabled:opacity-50"
                    >
                      <option value="USER">USER</option>
                      <option value="DESTEK">DESTEK</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      aria-label="Satıcı izni"
                      checked={u.canSell}
                      disabled={setSeller.isPending}
                      onChange={(e) => run(() => setSeller.mutateAsync({ id: u.id, canSell: e.target.checked }), 'Satıcı izni güncellendi.')}
                      className="w-4 h-4 accent-[#2563eb]"
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatTRY(u.walletBalance)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setModal({ kind: 'wallet', user: u })} className="px-2.5 py-1 rounded-lg bg-[#161824] border border-[#222534] text-[#38bdf8] font-bold">
                        Bakiye
                      </button>
                      {!self &&
                        u.role !== 'ADMIN' &&
                        (u.isBanned ? (
                          <button type="button" onClick={() => run(() => unban.mutateAsync(u.id), 'Hesap yeniden aktif.')} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                            Aktifleştir
                          </button>
                        ) : (
                          <button type="button" onClick={() => setModal({ kind: 'ban', user: u })} className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold">
                            Askıya Al
                          </button>
                        ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="pb-4">
        <Pagination page={users.data.meta.page} totalPages={users.data.meta.totalPages} onChange={setPage} />
      </div>
      {modal?.kind === 'ban' && <BanModal user={modal.user} onClose={() => setModal(null)} notify={notify} />}
      {modal?.kind === 'wallet' && <WalletModal user={modal.user} onClose={() => setModal(null)} notify={notify} />}
    </div>
  );
}

function SellerRequestsList({ notify }: { notify: Notify }) {
  const requests = useSellerRequestsAdmin();
  const [target, setTarget] = useState<{ request: SellerRequest; action: 'APPROVED' | 'REJECTED' } | null>(null);

  if (requests.isPending) return <LoadingState />;
  if (requests.isError) return <ErrorState message={getErrorMessage(requests.error)} onRetry={() => requests.refetch()} />;

  return (
    <div className="flex flex-col gap-3">
      {requests.data.length === 0 && <div className="bg-[#10121a] rounded-2xl p-10 border border-[#1c1f2b] text-center text-xs text-[#64748b]">Başvuru yok.</div>}
      {requests.data.map((r) => (
        <div key={r.id} className="p-5 rounded-2xl bg-[#10121a] border border-[#1c1f2b] flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-bold text-white">
              {r.user?.name} <span className="text-[11px] text-[#64748b] font-normal">{r.user?.email}</span>
            </div>
            <div className="text-[10px] text-[#64748b]">
              {formatDate(r.createdAt)} · {r.status}
            </div>
            <p className="text-xs text-[#94a3b8] mt-2 whitespace-pre-line">{r.reason}</p>
            {r.adminNotes && <p className="text-[11px] text-[#64748b] mt-1">Not: {r.adminNotes}</p>}
          </div>
          {r.status === 'PENDING' && (
            <div className="flex gap-2 shrink-0">
              <Button variant="success" onClick={() => setTarget({ request: r, action: 'APPROVED' })}>
                Onayla
              </Button>
              <Button variant="danger" onClick={() => setTarget({ request: r, action: 'REJECTED' })}>
                Reddet
              </Button>
            </div>
          )}
        </div>
      ))}
      {target && <ResolveRequestModal request={target.request} action={target.action} onClose={() => setTarget(null)} notify={notify} />}
    </div>
  );
}

export default function AdminUsersView() {
  const [tab, setTab] = useState<'users' | 'requests'>('users');
  const pendingCount = useSellerRequestsAdmin().data?.filter((r) => r.status === 'PENDING').length ?? 0;
  const { toast, show } = useToast();
  const notify: Notify = (msg, ok) => show(msg, ok ? 'success' : 'error');

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-4">
        <div>
          <h1 className="font-display font-extrabold text-xl text-white">Kullanıcı Yönetimi</h1>
          <p className="text-xs text-[#64748b] mt-1">Roller, satıcı izinleri, hesap askıya alma ve bakiye düzenlemeleri.</p>
        </div>
        <div className="flex gap-2">
          {(
            [
              ['users', 'Kullanıcılar'],
              ['requests', `Satıcı Başvuruları${pendingCount ? ` (${pendingCount})` : ''}`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`px-4 py-2 rounded-lg text-xs font-bold border ${tab === value ? 'bg-[#2563eb] border-[#2563eb] text-white' : 'bg-[#090a0f] border-[#1c1f2b] text-[#94a3b8]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'users' ? <UsersTable notify={notify} /> : <SellerRequestsList notify={notify} />}
      <Toast toast={toast} />
    </div>
  );
}
