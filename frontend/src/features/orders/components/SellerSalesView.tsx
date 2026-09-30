'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime, formatTRY, timeLeft } from '@/lib/utils/format';
import { splitLines } from '@/lib/validations/common';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Pagination } from '@/components/shared/Pagination';
import { Toast, useToast } from '@/components/shared/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, inputClass } from '@/components/ui/FormField';
import { useDeliverOrder, useSellerCancelOrder, useSellerSales } from '../hooks/useOrders';
import { deliverOrderSchema, DeliverOrderValues, sellerCancelSchema, SellerCancelValues } from '../schemas/order.schema';
import { ESCROW_LABELS } from '../constants';
import { Order } from '../types';

type Filter = 'pending' | 'all';
type Notify = (msg: string, ok: boolean) => void;

const itemCount = (o: Order) => o.items.reduce((s, i) => s + i.quantity, 0);

function DeliverModal({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: Notify }) {
  const deliver = useDeliverOrder();
  const max = itemCount(order);
  const { register, handleSubmit, formState } = useForm<DeliverOrderValues>({ resolver: zodResolver(deliverOrderSchema(max)), defaultValues: { codesText: '' } });

  const submit = handleSubmit(async (v) => {
    try {
      const codes = splitLines(v.codesText);
      await deliver.mutateAsync({ id: order.id, deliveryNotes: v.deliveryNotes, codes: codes.length ? codes : undefined });
      onDone('Sipariş teslim edildi. Alıcının onayından sonra ödeme bakiyenize aktarılır.', true);
    } catch (err) {
      onDone(getErrorMessage(err), false);
    }
  });

  return (
    <Modal open onClose={() => !deliver.isPending && onClose()} title={`Teslimat · #${order.orderNumber}`}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FormField label="Teslimat bilgisi (alıcı görür)" error={formState.errors.deliveryNotes?.message}>
          <textarea rows={4} maxLength={5000} className={inputClass} placeholder="Hesap bilgileri, kullanım talimatı vb." {...register('deliveryNotes')} />
        </FormField>
        <FormField label={`Kodlar (isteğe bağlı, her satıra bir kod · en fazla ${max})`} error={formState.errors.codesText?.message}>
          <textarea rows={4} className={`${inputClass} font-mono`} {...register('codesText')} />
        </FormField>
        <p className="text-[11px] text-[#64748b]">Teslimattan sonra alıcının onay süresi başlar. Alıcı onaylarsa veya süre dolarsa ödeme bakiyenize aktarılır.</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={deliver.isPending}>
            Vazgeç
          </Button>
          <Button type="submit" variant="success" className="flex-1" loading={deliver.isPending}>
            Teslim Et
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CancelModal({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: Notify }) {
  const cancel = useSellerCancelOrder();
  const { register, handleSubmit, formState } = useForm<SellerCancelValues>({ resolver: zodResolver(sellerCancelSchema) });

  const submit = handleSubmit(async (v) => {
    try {
      await cancel.mutateAsync({ id: order.id, reason: v.reason });
      onDone('Sipariş iptal edildi, alıcıya iade yapıldı.', true);
    } catch (err) {
      onDone(getErrorMessage(err), false);
    }
  });

  return (
    <Modal open onClose={() => !cancel.isPending && onClose()} title={`Siparişi İptal Et · #${order.orderNumber}`}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-[#94a3b8]">Sipariş iptal edilecek ve ödeme alıcıya iade edilecek. Bu işlem geri alınamaz.</p>
        <FormField label="İptal gerekçesi (alıcıya iletilir)" error={formState.errors.reason?.message}>
          <textarea rows={3} maxLength={500} className={inputClass} {...register('reason')} />
        </FormField>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={cancel.isPending}>
            Vazgeç
          </Button>
          <Button type="submit" variant="danger" className="flex-1" loading={cancel.isPending}>
            İptal Et ve İade Yap
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SaleCard({ order, onDeliver, onCancel }: { order: Order; onDeliver: () => void; onCancel: () => void }) {
  const pending = order.deliveryStatus === 'PENDING' && order.escrowStatus === 'HELD_IN_ESCROW';
  const left = timeLeft(order.deliveryDeadlineAt);
  return (
    <div className={`p-5 rounded-2xl bg-[#10121a] border flex flex-col gap-3 ${pending ? 'border-amber-500/30' : 'border-[#1c1f2b]'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1c1f2b]">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono font-bold text-sm text-white">#{order.orderNumber}</span>
          <span className="text-xs text-[#64748b]">{formatDateTime(order.createdAt)}</span>
          {pending ? (
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${left ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-rose-500/10 text-rose-300 border-rose-500/30'}`}>
              {left ? `Teslim için ${left}` : 'Süre doldu'}
            </span>
          ) : (
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${ESCROW_LABELS[order.escrowStatus].className}`}>
              {order.status === 'CANCELLED' ? 'İptal Edildi' : ESCROW_LABELS[order.escrowStatus].label}
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="font-display font-black text-sm text-emerald-400">{formatTRY(order.sellerAmount)}</div>
          {order.commissionAmount > 0 && (
            <div className="text-[10px] text-[#64748b]">
              {formatTRY(order.totalAmount)} − {formatTRY(order.commissionAmount)} komisyon
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 text-xs">
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between gap-3">
            <Link href={`/urun/${i.variant.product.slug}`} className="text-white font-semibold hover:text-[#38bdf8] truncate">
              {i.variant.product.title} × {i.quantity}
            </Link>
            <span className="text-[#94a3b8] shrink-0">{formatTRY(i.totalPrice)}</span>
          </div>
        ))}
        <div className="text-[11px] text-[#64748b]">Alıcı: {order.buyer.name}</div>
      </div>
      {pending && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#1c1f2b]">
          <Link href={`/hesabim/mesajlar?target=${order.buyer.id}`} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#161824] border border-[#222534] text-[#38bdf8] text-xs font-bold mr-auto">
            <span className="material-symbols-outlined text-sm">chat</span>
            Alıcıya Yaz
          </Link>
          <button type="button" onClick={onCancel} className="px-4 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 text-xs font-bold">
            Teslim Edemiyorum
          </button>
          <button type="button" onClick={onDeliver} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
            <span className="material-symbols-outlined text-sm">send</span>
            Teslim Et
          </button>
        </div>
      )}
    </div>
  );
}

export default function SellerSalesView() {
  const [filter, setFilter] = useState<Filter>('pending');
  const [page, setPage] = useState(1);
  const sales = useSellerSales(filter, page);
  const [modal, setModal] = useState<{ kind: 'deliver' | 'cancel'; order: Order } | null>(null);
  const { toast, show } = useToast();
  const onDone: Notify = (msg, ok) => {
    show(msg, ok ? 'success' : 'error');
    if (ok) setModal(null);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#38bdf8]">local_shipping</span>
            <h1 className="font-display font-extrabold text-xl text-white">Satışlarım</h1>
          </div>
          <p className="text-xs text-[#94a3b8] mt-1">Manuel teslimatlı siparişleri süresi içinde teslim edin; süre dolarsa ödeme alıcıya iade edilir.</p>
        </div>
        <div className="flex items-center bg-[#090a0f] p-1 rounded-xl border border-[#1c1f2b]">
          {(
            [
              ['pending', 'Teslim Bekleyen'],
              ['all', 'Tüm Satışlar'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filter === value ? 'bg-[#2563eb] text-white' : 'text-[#94a3b8] hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {sales.isPending ? (
        <LoadingState />
      ) : sales.isError ? (
        <ErrorState message={getErrorMessage(sales.error)} onRetry={() => sales.refetch()} />
      ) : sales.data.items.length === 0 ? (
        <EmptyState
          icon="inventory"
          title={filter === 'pending' ? 'Teslim bekleyen sipariş yok' : 'Henüz satışınız yok'}
          description={filter === 'pending' ? 'Yeni bir manuel teslimat siparişi geldiğinde burada görünecek.' : 'İlanlarınız satıldıkça burada listelenecek.'}
          action={filter === 'all' ? { label: 'İlanlarım', href: '/hesabim/pazar' } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {sales.data.items.map((o) => (
            <SaleCard key={o.id} order={o} onDeliver={() => setModal({ kind: 'deliver', order: o })} onCancel={() => setModal({ kind: 'cancel', order: o })} />
          ))}
        </div>
      )}
      {sales.data && <Pagination page={sales.data.meta.page} totalPages={sales.data.meta.totalPages} onChange={setPage} />}

      {modal?.kind === 'deliver' && <DeliverModal order={modal.order} onClose={() => setModal(null)} onDone={onDone} />}
      {modal?.kind === 'cancel' && <CancelModal order={modal.order} onClose={() => setModal(null)} onDone={onDone} />}
      <Toast toast={toast} />
    </div>
  );
}
