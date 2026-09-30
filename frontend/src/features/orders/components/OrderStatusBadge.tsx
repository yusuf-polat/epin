import { timeLeft } from '@/lib/utils/format';
import { Order } from '../types';
import { ESCROW_LABELS } from '../constants';

/** Siparişin alıcı gözünden durumunu tek bir rozetle özetler */
export function OrderStatusBadge({ order }: { order: Pick<Order, 'status' | 'deliveryStatus' | 'escrowStatus' | 'autoReleaseAt' | 'deliveryDeadlineAt'> }) {
  let label: string;
  let className: string;

  if (order.status === 'CANCELLED') {
    label = 'İptal Edildi · İade Yapıldı';
    className = 'bg-slate-500/10 text-slate-300 border-slate-500/30';
  } else if (order.deliveryStatus === 'PENDING' && order.escrowStatus === 'HELD_IN_ESCROW') {
    const left = timeLeft(order.deliveryDeadlineAt);
    label = left ? `Satıcı Teslimatı Bekleniyor (${left})` : 'Teslim Süresi Doldu';
    className = left ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-rose-500/10 text-rose-300 border-rose-500/30';
  } else if (order.escrowStatus === 'HELD_IN_ESCROW') {
    const left = timeLeft(order.autoReleaseAt);
    label = `Onayınız Bekleniyor${left ? ` (${left})` : ''}`;
    className = ESCROW_LABELS.HELD_IN_ESCROW.className;
  } else {
    label = ESCROW_LABELS[order.escrowStatus].label;
    className = ESCROW_LABELS[order.escrowStatus].className;
  }

  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${className}`}>{label}</span>;
}
