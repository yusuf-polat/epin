'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime, formatTRY } from '@/lib/utils/format';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Pagination } from '@/components/shared/Pagination';
import { Modal } from '@/components/ui/Modal';
import { useAdminOrders } from '../hooks/useOrders';
import { ESCROW_LABELS } from '../constants';
import { AdminOrderParams, DeliveryStatus, EscrowStatus, Order } from '../types';

const selectClass = 'px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs text-white focus:outline-none focus:border-[#38bdf8]';

const DELIVERY_LABELS: Record<DeliveryStatus, string> = { PENDING: 'Teslim Bekliyor', DELIVERED: 'Teslim Edildi', FAILED: 'Teslim Edilmedi' };

function OrderDetail({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={`Sipariş #${order.orderNumber}`}>
      <div className="flex flex-col gap-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Alıcı', order.buyer.name],
            ['Satıcı', order.seller ? order.seller.store?.name ?? order.seller.name : 'Platform'],
            ['Tutar', formatTRY(order.totalAmount)],
            ['Komisyon', formatTRY(order.commissionAmount)],
            ['Satıcıya Net', formatTRY(order.sellerAmount)],
            ['Escrow', ESCROW_LABELS[order.escrowStatus].label],
            ['Teslimat', `${order.deliveryType === 'MANUAL' ? 'Manuel' : 'Anında'} · ${DELIVERY_LABELS[order.deliveryStatus]}`],
            ['Oluşturma', formatDateTime(order.createdAt)],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-[10px] uppercase tracking-wider text-[#64748b] font-bold">{label}</div>
              <div className="text-white">{value}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 pt-3 border-t border-[#1c1f2b]">
          {order.items.map((i) => (
            <div key={i.id} className="flex justify-between gap-3">
              <Link href={`/urun/${i.variant.product.slug}`} target="_blank" className="text-white hover:text-[#38bdf8] truncate">
                {i.variant.product.title} × {i.quantity}
              </Link>
              <span className="text-[#94a3b8] shrink-0">{formatTRY(i.totalPrice)}</span>
            </div>
          ))}
        </div>
        {order.dispute && (
          <Link href="/panel/itirazlar" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 font-bold">
            Bu siparişte itiraz var ({order.dispute.status}) → İtiraz paneli
          </Link>
        )}
        {order.deliveryNotes && <p className="text-[#94a3b8] whitespace-pre-line">Teslimat notu: {order.deliveryNotes}</p>}
      </div>
    </Modal>
  );
}

export default function AdminOrdersView() {
  const [params, setParams] = useState<AdminOrderParams>({ page: 1 });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const list = useAdminOrders(params);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-4">
        <div>
          <h1 className="font-display font-extrabold text-xl text-white">Siparişler</h1>
          <p className="text-xs text-[#64748b] mt-1">Tüm siparişleri escrow ve teslimat durumuna göre inceleyin.</p>
        </div>
        <form
          className="flex flex-col md:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setParams({ ...params, page: 1, search: search.trim() || undefined });
          }}
        >
          <select
            aria-label="Escrow durumu"
            className={selectClass}
            value={params.escrowStatus ?? ''}
            onChange={(e) => setParams({ ...params, page: 1, escrowStatus: (e.target.value || undefined) as EscrowStatus | undefined })}
          >
            <option value="">Tüm escrow durumları</option>
            {Object.entries(ESCROW_LABELS).map(([value, s]) => (
              <option key={value} value={value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Teslimat durumu"
            className={selectClass}
            value={params.deliveryStatus ?? ''}
            onChange={(e) => setParams({ ...params, page: 1, deliveryStatus: (e.target.value || undefined) as DeliveryStatus | undefined })}
          >
            <option value="">Tüm teslimat durumları</option>
            {Object.entries(DELIVERY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} maxLength={100} placeholder="Sipariş no, alıcı/satıcı e-postası" className={`${selectClass} flex-1`} />
          <button type="submit" className="px-4 py-2 rounded-xl bg-[#161824] border border-[#222534] text-white text-xs font-bold">
            Ara
          </button>
        </form>
      </div>

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState message={getErrorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState icon="receipt_long" title="Sipariş bulunamadı" />
      ) : (
        <div className="bg-[#10121a] rounded-2xl border border-[#1c1f2b] overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1c1f2b] text-[#64748b]">
                <th className="text-left px-4 py-3">Sipariş</th>
                <th className="text-left px-4 py-3">Alıcı → Satıcı</th>
                <th className="text-left px-4 py-3">Durum</th>
                <th className="text-right px-4 py-3">Tutar</th>
                <th className="text-right px-4 py-3">Komisyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1f2b]">
              {list.data.items.map((o) => (
                <tr key={o.id} onClick={() => setSelected(o)} className="cursor-pointer hover:bg-[#131622]/60">
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-white">#{o.orderNumber}</div>
                    <div className="text-[11px] text-[#64748b]">{formatDateTime(o.createdAt)}</div>
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8]">
                    {o.buyer.name} → {o.seller ? o.seller.store?.name ?? o.seller.name : 'Platform'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ESCROW_LABELS[o.escrowStatus].className}`}>
                      {o.status === 'CANCELLED' ? 'İptal' : ESCROW_LABELS[o.escrowStatus].label}
                    </span>
                    {o.deliveryStatus === 'PENDING' && <span className="ml-1 text-[10px] text-amber-300">· teslim bekliyor</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-white">{formatTRY(o.totalAmount)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatTRY(o.commissionAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.data && <Pagination page={list.data.meta.page} totalPages={list.data.meta.totalPages} onChange={(page) => setParams({ ...params, page })} />}
      {selected && <OrderDetail order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
