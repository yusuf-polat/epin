'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime, formatTRY } from '@/lib/utils/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, inputClass } from '@/components/ui/FormField';
import { ACTIVE_DISPUTE_STATUSES, DISPUTE_STATUS_LABELS } from '@/features/disputes/constants';
import { useCancelDispute, useEscalateDispute } from '@/features/disputes/hooks/useDisputes';
import type { DisputeStatus } from '@/features/disputes/types';
import { useCancelOverdueOrder, useConfirmOrder } from '../hooks/useOrders';
import { escalateSchema, EscalateValues } from '../schemas/order.schema';
import { Order } from '../types';
import { OrderStatusBadge } from './OrderStatusBadge';

export type ActionKind = 'confirm' | 'cancel' | 'withdraw' | 'escalate';

const MODAL_TEXT: Record<ActionKind, { title: string; body: string; cta: string }> = {
  confirm: {
    title: 'Teslimatı Onayla',
    body: 'Kodu/ürünü sorunsuz teslim aldığınızı onaylıyorsunuz. Onay sonrası ödeme satıcıya aktarılır ve itiraz açılamaz.',
    cta: 'Evet, Onayla',
  },
  cancel: {
    title: 'Siparişi İptal Et',
    body: 'Satıcı teslim süresi içinde teslim etmedi. Siparişi iptal ederseniz ödemeniz cüzdanınıza iade edilir.',
    cta: 'İptal Et ve İade Al',
  },
  withdraw: { title: 'İtirazı Geri Çek', body: 'İtirazınızı geri çekerseniz sipariş yeniden onay sürecine döner.', cta: 'Geri Çek' },
  escalate: {
    title: 'Destek Ekibine İlet',
    body: 'Satıcının gönderdiği değişim kodu da çalışmıyorsa sorunu açıklayın; hakem ekibimiz inceleyecektir.',
    cta: 'Destek Ekibine İlet',
  },
};

const SUCCESS_TEXT: Record<ActionKind, string> = {
  confirm: 'Teslimat onaylandı, ödeme satıcıya aktarıldı.',
  cancel: 'Sipariş iptal edildi, ödemeniz cüzdanınıza iade edildi.',
  withdraw: 'İtirazınız geri çekildi.',
  escalate: 'İtirazınız destek ekibine iletildi.',
};

export function OrderActionModal({ action, onClose, onDone }: { action: { kind: ActionKind; order: Order } | null; onClose: () => void; onDone: (msg: string, ok: boolean) => void }) {
  const confirm = useConfirmOrder();
  const cancel = useCancelOverdueOrder();
  const withdraw = useCancelDispute();
  const escalate = useEscalateDispute();
  const form = useForm<EscalateValues>({ resolver: zodResolver(escalateSchema) });
  const busy = confirm.isPending || cancel.isPending || withdraw.isPending || escalate.isPending;

  const run = async (values?: EscalateValues) => {
    if (!action) return;
    const { kind, order } = action;
    try {
      if (kind === 'confirm') await confirm.mutateAsync(order.id);
      if (kind === 'cancel') await cancel.mutateAsync(order.id);
      if (kind === 'withdraw' && order.dispute) await withdraw.mutateAsync(order.dispute.id);
      if (kind === 'escalate' && order.dispute && values) await escalate.mutateAsync({ id: order.dispute.id, description: values.description });
      form.reset();
      onDone(SUCCESS_TEXT[kind], true);
    } catch (err) {
      onDone(getErrorMessage(err), false);
    }
  };

  if (!action) return null;
  const text = MODAL_TEXT[action.kind];
  return (
    <Modal open onClose={() => !busy && onClose()} title={text.title}>
      <form
        className="flex flex-col gap-4"
        onSubmit={action.kind === 'escalate' ? form.handleSubmit(run) : (e) => {
          e.preventDefault();
          void run();
        }}
      >
        <p className="text-sm text-[#94a3b8]">
          {text.body}
          {action.kind === 'confirm' && (
            <>
              {' '}
              Tutar: <strong className="text-white">{formatTRY(action.order.totalAmount)}</strong>
            </>
          )}
        </p>
        {action.kind === 'escalate' && (
          <FormField label="Açıklama" error={form.formState.errors.description?.message}>
            <textarea rows={3} maxLength={2000} className={inputClass} placeholder="Değişim kodunda yaşadığınız sorun" {...form.register('description')} />
          </FormField>
        )}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button type="submit" variant={action.kind === 'confirm' ? 'success' : action.kind === 'cancel' ? 'danger' : 'primary'} className="flex-1" loading={busy}>
            {text.cta}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function OrderCard({ order, onAction, showDetailLink = true }: { order: Order; onAction: (kind: ActionKind) => void; showDetailLink?: boolean }) {
  const dispute = order.dispute;
  const activeDispute = !!dispute && ACTIVE_DISPUTE_STATUSES.includes(dispute.status as DisputeStatus);
  const replaced = dispute?.status === 'SELLER_APPROVED' && dispute.sellerAction === 'REPLACE';
  const canConfirm = order.escrowStatus === 'HELD_IN_ESCROW' && order.deliveryStatus === 'DELIVERED' && !activeDispute;
  const canDispute = canConfirm && (!dispute || dispute.status === 'CANCELLED');
  const overdue =
    order.deliveryStatus === 'PENDING' && order.escrowStatus === 'HELD_IN_ESCROW' && !!order.deliveryDeadlineAt && new Date(order.deliveryDeadlineAt) <= new Date();
  const disputeStyle = dispute ? DISPUTE_STATUS_LABELS[dispute.status as DisputeStatus] : null;

  return (
    <div className="p-5 rounded-2xl bg-[#10121a] border border-[#1c1f2b] flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1c1f2b] gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          {showDetailLink ? (
            <Link href={`/hesabim/siparislerim/${order.id}`} className="font-mono font-bold text-sm text-white hover:text-[#38bdf8]">
              #{order.orderNumber}
            </Link>
          ) : (
            <span className="font-mono font-bold text-sm text-white">#{order.orderNumber}</span>
          )}
          <span className="text-xs text-[#64748b]">{formatDateTime(order.createdAt)}</span>
          <OrderStatusBadge order={order} />
        </div>
        <span className="font-display font-black text-sm text-white">{formatTRY(order.totalAmount)}</span>
      </div>

      <div className="flex flex-col gap-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
            <Link href={`/urun/${item.variant.product.slug}`} className="text-white font-semibold hover:text-[#38bdf8] truncate">
              {item.variant.product.title} · {item.variant.denomination} × {item.quantity}
            </Link>
            <span className="text-[#94a3b8] shrink-0">{formatTRY(item.totalPrice)}</span>
          </div>
        ))}
        <div className="text-[11px] text-[#64748b]">Satıcı: {order.seller?.store?.name ?? order.seller?.name ?? 'NexusPin'}</div>
      </div>

      {order.deliveryNotes && (
        <div className="p-3 rounded-lg bg-[#090a0f] border border-[#1c1f2b]">
          <p className="text-[11px] text-[#64748b] font-semibold mb-1">Satıcının teslimat notu</p>
          <p className="text-xs text-white whitespace-pre-line break-words">{order.deliveryNotes}</p>
        </div>
      )}

      {dispute && dispute.status !== 'CANCELLED' && disputeStyle && (
        <div className="p-3 rounded-lg bg-[#090a0f] border border-[#1c1f2b] flex flex-wrap items-center gap-2 text-xs">
          <span className="material-symbols-outlined text-sm text-rose-400">gavel</span>
          <span className="text-[#94a3b8]">İtiraz durumu:</span>
          <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${disputeStyle.className}`}>{disputeStyle.label}</span>
          {replaced && <span className="text-purple-300">Satıcı yeni kod gönderdi; Dijital Kodlarım sayfasında görebilirsiniz.</span>}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#1c1f2b]">
        {order.pins.length > 0 && (
          <Link href="/hesabim/kodlarim" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#38bdf8] hover:underline mr-auto">
            <span className="material-symbols-outlined text-sm">vpn_key</span>
            Kodları Göster ({order.pins.length})
          </Link>
        )}
        {canConfirm && (
          <button type="button" onClick={() => onAction('confirm')} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Sorunsuz Teslim Aldım
          </button>
        )}
        {canDispute && (
          <Link href={`/hesabim/siparislerim/${order.id}/itiraz`} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-bold">
            <span className="material-symbols-outlined text-sm">report</span>
            Sorun Bildir
          </Link>
        )}
        {overdue && (
          <button type="button" onClick={() => onAction('cancel')} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 text-xs font-bold">
            <span className="material-symbols-outlined text-sm">undo</span>
            İptal Et ve İade Al
          </button>
        )}
        {activeDispute && (
          <button type="button" onClick={() => onAction('withdraw')} className="px-4 py-1.5 rounded-lg bg-[#161824] border border-[#222534] text-[#94a3b8] hover:text-white text-xs font-bold">
            İtirazı Geri Çek
          </button>
        )}
        {replaced && order.escrowStatus === 'HELD_IN_ESCROW' && (
          <button type="button" onClick={() => onAction('escalate')} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 text-xs font-bold">
            <span className="material-symbols-outlined text-sm">support_agent</span>
            Yeni Kod da Çalışmadı
          </button>
        )}
      </div>
    </div>
  );
}
