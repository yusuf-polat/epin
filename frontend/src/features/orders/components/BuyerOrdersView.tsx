'use client';

import React, { useState } from 'react';
import { getErrorMessage } from '@/lib/api';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Pagination } from '@/components/shared/Pagination';
import { Toast, useToast } from '@/components/shared/Toast';
import { useMyOrders } from '../hooks/useOrders';
import { Order } from '../types';
import { ActionKind, OrderActionModal, OrderCard } from './OrderCard';

export default function BuyerOrdersView() {
  const [page, setPage] = useState(1);
  const orders = useMyOrders(page);
  const [action, setAction] = useState<{ kind: ActionKind; order: Order } | null>(null);
  const { toast, show } = useToast();

  if (orders.isPending) return <LoadingState label="Siparişleriniz yükleniyor..." />;
  if (orders.isError) return <ErrorState message={getErrorMessage(orders.error)} onRetry={() => orders.refetch()} />;

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#38bdf8]">receipt_long</span>
            <h1 className="font-display font-extrabold text-xl text-white">Siparişlerim</h1>
          </div>
          <p className="text-xs text-[#94a3b8] mt-1">Ödemeniz, teslimatı onaylayana kadar güvenli havuzda tutulur.</p>
        </div>
        <div className="text-xs font-semibold text-[#94a3b8] px-3 py-1.5 rounded-xl bg-[#090a0f] border border-[#1c1f2b]">Toplam {orders.data.meta.total} sipariş</div>
      </div>

      {orders.data.items.length === 0 ? (
        <EmptyState icon="shopping_cart" title="Henüz Sipariş Vermediniz" description="Katalogdaki ürünleri inceleyip güvenle satın alabilirsiniz." action={{ label: 'Alışverişe Başla', href: '/katalog' }} />
      ) : (
        <div className="flex flex-col gap-4">
          {orders.data.items.map((order) => (
            <OrderCard key={order.id} order={order} onAction={(kind) => setAction({ kind, order })} />
          ))}
        </div>
      )}
      <Pagination page={orders.data.meta.page} totalPages={orders.data.meta.totalPages} onChange={setPage} />

      <OrderActionModal
        action={action}
        onClose={() => setAction(null)}
        onDone={(msg, ok) => {
          show(msg, ok ? 'success' : 'error');
          if (ok) setAction(null);
        }}
      />
      <Toast toast={toast} />
    </div>
  );
}
