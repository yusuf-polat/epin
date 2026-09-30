'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
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
import { useAdminProducts, useApproveProduct, useRejectProduct } from '../hooks/useProducts';
import { rejectListingSchema, RejectListingValues } from '../schemas/product.schema';
import { ApprovalStatus, Product } from '../types';

const STATUS_TABS: { value: ApprovalStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING', label: 'Onay Bekleyen' },
  { value: 'APPROVED', label: 'Onaylı' },
  { value: 'REJECTED', label: 'Reddedilen' },
  { value: 'ALL', label: 'Tümü' },
];

export default function AdminProductsView() {
  const [status, setStatus] = useState<ApprovalStatus | 'ALL'>('PENDING');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<Product | null>(null);
  const { toast, show } = useToast();
  const list = useAdminProducts({ page, limit: 20, status, search: query || undefined });
  const approveMutation = useApproveProduct();
  const rejectMutation = useRejectProduct();
  const rejectForm = useForm<RejectListingValues>({ resolver: zodResolver(rejectListingSchema), defaultValues: { reason: '' } });
  const items = list.data?.items ?? [];
  const meta = list.data?.meta;

  const approve = async (p: Product) => {
    try {
      await approveMutation.mutateAsync(p.id);
      show(`"${p.title}" yayına alındı.`);
    } catch (err) {
      show(getErrorMessage(err), 'error');
    }
  };

  const openReject = (p: Product) => {
    rejectForm.reset({ reason: '' });
    setRejectTarget(p);
  };

  const reject = rejectForm.handleSubmit(async ({ reason }) => {
    if (!rejectTarget) return;
    try {
      await rejectMutation.mutateAsync({ id: rejectTarget.id, reason });
      show('İlan reddedildi, satıcı bilgilendirildi.');
      setRejectTarget(null);
    } catch (err) {
      show(getErrorMessage(err), 'error');
    }
  });

  const isBusy = (id: string) => (approveMutation.isPending && approveMutation.variables === id) || (rejectMutation.isPending && rejectMutation.variables?.id === id);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-4">
        <div>
          <h1 className="font-display font-extrabold text-xl text-white">İlan Onayları</h1>
          <p className="text-xs text-[#94a3b8] mt-1">Satıcı ilanlarını yayına almadan önce içerik ve fiyat açısından kontrol edin.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setStatus(t.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${
                  status === t.value ? 'bg-[#2563eb] border-[#2563eb] text-white' : 'bg-[#090a0f] border-[#1c1f2b] text-[#94a3b8] hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setQuery(search.trim());
            }}
          >
            <input
              value={search}
              maxLength={100}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İlan ara..."
              className="px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs text-white focus:outline-none focus:border-[#38bdf8]"
            />
            <button type="submit" className="px-3 rounded-xl bg-[#161824] border border-[#222534] text-white text-xs font-bold">
              Ara
            </button>
          </form>
        </div>
      </div>

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState message={getErrorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="task_alt" title="Bu listede ilan yok" />
      ) : (
        <div className="bg-[#10121a] rounded-2xl border border-[#1c1f2b] divide-y divide-[#1c1f2b]">
          {items.map((p) => (
            <div key={p.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <img src={p.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-[#23293a] shrink-0" />
                <div className="min-w-0">
                  <Link href={`/urun/${p.slug}`} target="_blank" className="font-bold text-sm text-white hover:text-[#38bdf8] line-clamp-1">
                    {p.title}
                  </Link>
                  <div className="text-[11px] text-[#64748b] mt-0.5">
                    {p.category?.name} · {p.seller ? `${p.seller.store?.name ?? p.seller.name} (${p.seller.email})` : 'Platform'} · {formatDateTime(p.createdAt)}
                  </div>
                  <div className="text-[11px] text-[#94a3b8] mt-1">
                    {p.variants.map((v) => `${v.denomination}: ${formatTRY(v.price)}`).join(' · ')} · Stok {p.totalStock} ·{' '}
                    {p.deliveryType === 'MANUAL' ? `Manuel (${p.deliveryDeadlineHours} sa)` : 'Anında'}
                  </div>
                  {p.rejectedReason && <div className="text-[11px] text-rose-300 mt-1">Red gerekçesi: {p.rejectedReason}</div>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {p.approvalStatus !== 'APPROVED' && (
                  <Button variant="success" loading={isBusy(p.id)} onClick={() => approve(p)}>
                    Onayla
                  </Button>
                )}
                {p.approvalStatus !== 'REJECTED' && (
                  <Button variant="danger" disabled={isBusy(p.id)} onClick={() => openReject(p)}>
                    Reddet
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {meta && <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />}

      <Modal open={!!rejectTarget} onClose={() => !rejectMutation.isPending && setRejectTarget(null)} title="İlanı Reddet">
        <form onSubmit={reject} className="flex flex-col gap-4">
          <p className="text-xs text-[#94a3b8]">{rejectTarget?.title}</p>
          <FormField label="Red gerekçesi" error={rejectForm.formState.errors.reason?.message}>
            <textarea rows={3} maxLength={500} placeholder="Satıcıya iletilecek red gerekçesi" className={inputClass} {...rejectForm.register('reason')} />
          </FormField>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setRejectTarget(null)}>
              Vazgeç
            </Button>
            <Button type="submit" variant="danger" className="flex-1" loading={rejectMutation.isPending}>
              Reddet
            </Button>
          </div>
        </form>
      </Modal>
      <Toast toast={toast} />
    </div>
  );
}
