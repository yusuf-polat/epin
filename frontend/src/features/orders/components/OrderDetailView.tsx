'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime, formatTRY } from '@/lib/utils/format';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Toast, useToast } from '@/components/shared/Toast';
import { useOrder } from '../hooks/useOrders';
import { Order } from '../types';
import { ActionKind, OrderActionModal, OrderCard } from './OrderCard';

interface Step {
  label: string;
  at: string | null;
  done: boolean;
  hint?: string;
}

/** Sipariş zaman çizelgesi: oluşturma → teslimat → onay/iade */
function timeline(order: Order): Step[] {
  const refunded = order.escrowStatus === 'REFUNDED_TO_BUYER';
  const released = order.escrowStatus === 'RELEASED_TO_SELLER';
  const delivered = order.deliveryStatus === 'DELIVERED';
  const steps: Step[] = [
    { label: 'Sipariş oluşturuldu, ödeme güvenli havuza alındı', at: order.createdAt, done: true },
    {
      label: order.deliveryType === 'MANUAL' ? 'Satıcı teslim etti' : 'Kodlar teslim edildi',
      at: order.deliveredAt,
      done: delivered,
      hint: !delivered && order.deliveryDeadlineAt ? `Son teslim: ${formatDateTime(order.deliveryDeadlineAt)}` : undefined,
    },
  ];
  if (order.dispute && order.dispute.status !== 'CANCELLED') {
    steps.push({ label: 'İtiraz açıldı', at: order.dispute.createdAt, done: true });
  }
  if (refunded) steps.push({ label: 'Ödeme cüzdanınıza iade edildi', at: null, done: true });
  else
    steps.push({
      label: 'Ödeme satıcıya aktarıldı',
      at: null,
      done: released,
      hint: !released && delivered && order.autoReleaseAt ? `Onay vermezseniz ${formatDateTime(order.autoReleaseAt)} tarihinde otomatik aktarılır` : undefined,
    });
  return steps;
}

export default function OrderDetailView({ id }: { id: string }) {
  const order = useOrder(id);
  const [action, setAction] = useState<{ kind: ActionKind; order: Order } | null>(null);
  const { toast, show } = useToast();

  if (order.isPending) return <LoadingState label="Sipariş yükleniyor..." />;
  if (order.isError) return <ErrorState message={getErrorMessage(order.error, 'Sipariş bulunamadı')} onRetry={() => order.refetch()} />;
  const o = order.data;

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/hesabim/siparislerim" className="text-xs font-bold text-[#94a3b8] hover:text-white flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Siparişlerim
        </Link>
        {o.seller && (
          <Link
            href={`/hesabim/mesajlar?target=${o.seller.id}`}
            className="px-3 py-2 rounded-xl bg-[#161824] border border-[#222534] text-[#38bdf8] text-xs font-bold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">chat</span>
            Satıcıya Mesaj
          </Link>
        )}
      </div>

      <OrderCard order={o} onAction={(kind) => setAction({ kind, order: o })} showDetailLink={false} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-4">
          <h2 className="font-display font-bold text-base text-white">Sipariş Durumu</h2>
          <ol className="flex flex-col gap-4">
            {timeline(o).map((s) => (
              <li key={s.label} className="flex gap-3">
                <span className={`material-symbols-outlined text-lg ${s.done ? 'text-emerald-400' : 'text-[#334155]'}`}>{s.done ? 'check_circle' : 'radio_button_unchecked'}</span>
                <div className="text-xs">
                  <div className={s.done ? 'text-white font-bold' : 'text-[#94a3b8]'}>{s.label}</div>
                  {s.at && <div className="text-[#64748b]">{formatDateTime(s.at)}</div>}
                  {s.hint && <div className="text-amber-300/90">{s.hint}</div>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-4">
          <h2 className="font-display font-bold text-base text-white">Ödeme Özeti</h2>
          <div className="text-xs flex flex-col gap-2">
            {[
              ['Ödeme yöntemi', o.paymentMethod === 'WALLET' ? 'NexusPin Cüzdan' : o.paymentMethod],
              ['Teslimat', o.deliveryType === 'MANUAL' ? 'Satıcı teslimatı' : 'Anında teslimat'],
              ['Satıcı', o.seller?.store?.name ?? o.seller?.name ?? 'NexusPin'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <span className="text-[#64748b]">{label}</span>
                <span className="text-white">{value}</span>
              </div>
            ))}
            <div className="flex justify-between gap-3 pt-2 border-t border-[#1c1f2b] font-bold">
              <span className="text-white">Toplam</span>
              <span className="font-mono text-[#38bdf8]">{formatTRY(o.totalAmount)}</span>
            </div>
          </div>
          <p className="text-[11px] text-[#64748b]">
            Ödemeniz, teslimatı onaylayana kadar NexusPin güvenli havuzunda (escrow) tutulur. Sorun yaşarsanız &quot;Sorun Bildir&quot; ile itiraz açabilirsiniz.
          </p>
          {o.pins.length > 0 && (
            <Link href="/hesabim/kodlarim" className="self-start px-4 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">vpn_key</span>
              Dijital Kodlarım
            </Link>
          )}
        </section>
      </div>

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
