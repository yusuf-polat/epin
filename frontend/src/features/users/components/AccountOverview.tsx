import Link from 'next/link';
import { formatDate, formatTRY } from '@/lib/utils/format';
import type { AuthUser } from '@/features/auth/types';
import type { Order } from '@/features/orders/types';
import type { NotificationItem } from '@/features/notifications/types';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';

interface AccountOverviewProps {
  user: AuthUser;
  orders: Order[];
  pinCount: number;
  notifications: NotificationItem[];
  pendingSales: number;
}

export default function AccountOverview({ user, orders, pinCount, notifications, pendingSales }: AccountOverviewProps) {
  const store = user.store;
  const isSeller = user.canSell || user.role === 'ADMIN';
  const awaitingAction = orders.filter((o) => o.escrowStatus === 'HELD_IN_ESCROW' && o.deliveryStatus === 'DELIVERED' && !o.dispute).length;

  const metrics = [
    { label: 'Cüzdan Bakiyesi', value: formatTRY(user.walletBalance), href: '/hesabim/cuzdan', link: 'Cüzdanım', icon: 'account_balance_wallet', color: 'text-emerald-400' },
    { label: 'Dijital Kodlar', value: `${pinCount} adet`, href: '/hesabim/kodlarim', link: 'Kodları Görüntüle', icon: 'vpn_key', color: 'text-[#38bdf8]' },
    { label: 'Onay Bekleyen Sipariş', value: `${awaitingAction} adet`, href: '/hesabim/siparislerim', link: 'Siparişlerim', icon: 'receipt_long', color: 'text-purple-400' },
  ];

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 sm:p-8 text-white border border-[#1c1f2b]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {user.role === 'ADMIN' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">YÖNETİCİ</span>
              )}
              {user.canSell && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-[#38bdf8] border border-blue-500/20">ONAYLI SATICI</span>
              )}
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white">Hoş Geldiniz, {user.name}</h1>
            <p className="text-xs sm:text-sm text-[#94a3b8] mt-1.5 max-w-xl">Kodlarınız, siparişleriniz ve cüzdanınız tek merkezde.</p>
          </div>
          <Link href="/katalog" className="px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all shadow-lg shrink-0 text-center">
            Kataloğa Git
          </Link>
        </div>
      </div>

      {isSeller && (
        <div className="bg-[#10121a] rounded-2xl p-5 border border-[#1c1f2b] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#38bdf8] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">storefront</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm text-white">{store ? store.name : 'Mağazanız'}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    store ? (store.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400') : 'bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {store ? (store.isActive ? 'Yayında' : 'Askıda') : 'Oluşturulmadı'}
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                {store
                  ? pendingSales > 0
                    ? `${pendingSales} sipariş teslimatınızı bekliyor.`
                    : 'Teslim bekleyen siparişiniz yok.'
                  : 'Satıcı yetkiniz hazır. İlan yayınlamak için mağazanızı oluşturun.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {store && pendingSales > 0 && (
              <Link href="/hesabim/pazar/satislar" className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-300">
                Teslim Et
              </Link>
            )}
            <Link
              href={store ? '/hesabim/pazar' : '/hesabim/magazam/olustur'}
              className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-xs font-bold text-white transition-all"
            >
              {store ? 'İlanlarım' : 'Mağaza Oluştur'}
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-[#10121a] p-5 rounded-2xl border border-[#1c1f2b] shadow-md flex items-center justify-between">
            <div>
              <div className="text-xs text-[#64748b] font-semibold">{m.label}</div>
              <div className={`font-display font-black text-2xl mt-1 ${m.color}`}>{m.value}</div>
              <Link href={m.href} className="text-[11px] font-bold text-[#38bdf8] hover:underline mt-1 block">
                {m.link} →
              </Link>
            </div>
            <div className={`w-12 h-12 rounded-2xl bg-[#161a28] border border-[#232a40] flex items-center justify-center ${m.color}`}>
              <span className="material-symbols-outlined text-2xl">{m.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {notifications.length > 0 && (
        <div className="bg-[#10121a] rounded-2xl p-5 border border-[#1c1f2b] shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-[#1c1f2b] mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-lg">notifications</span>
              <h3 className="font-display font-bold text-sm text-white">Son Bildirimler</h3>
            </div>
            <Link href="/hesabim/bildirimler" className="text-xs font-bold text-[#38bdf8] hover:underline">
              Tümü →
            </Link>
          </div>
          <div className="divide-y divide-[#1c1f2b]/40">
            {notifications.map((n) => (
              <div key={n.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white">{n.title}</div>
                  <p className="text-[11px] text-[#94a3b8] line-clamp-1 mt-0.5">{n.message}</p>
                </div>
                <span className="text-[10px] font-mono text-[#64748b] shrink-0">{formatDate(n.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] shadow-md flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1c1f2b]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#38bdf8]">receipt_long</span>
            <h3 className="font-display font-bold text-base text-white">Son Siparişleriniz</h3>
          </div>
          <Link href="/hesabim/siparislerim" className="text-xs font-bold text-[#38bdf8] hover:underline">
            Tümünü Gör →
          </Link>
        </div>
        {orders.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#64748b]">Henüz siparişiniz bulunmuyor.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1c1f2b] text-[#64748b]">
                  <th className="pb-3 font-semibold">Sipariş No</th>
                  <th className="pb-3 font-semibold">Tarih</th>
                  <th className="pb-3 font-semibold">Tutar</th>
                  <th className="pb-3 font-semibold">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181a24]">
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 font-mono font-bold text-white">
                      <Link href="/hesabim/siparislerim" className="hover:text-[#38bdf8]">
                        #{o.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 text-[#94a3b8]">{formatDate(o.createdAt)}</td>
                    <td className="py-3 font-bold text-white">{formatTRY(o.totalAmount)}</td>
                    <td className="py-3">
                      <OrderStatusBadge order={o} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
