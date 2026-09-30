import Link from 'next/link';
import { formatTRY } from '@/lib/utils/format';
import { DashboardReport, SalesSummary } from '../types';

function StatCard({ label, value, href, link, icon, color }: { label: string; value: string | number; href: string; link: string; icon: string; color: string }) {
  return (
    <div className="bg-[#10121a] p-5 rounded-2xl border border-[#1c1f2b] flex items-center justify-between">
      <div>
        <span className="text-xs font-semibold text-[#64748b]">{label}</span>
        <div className={`font-display font-black text-2xl mt-1 ${color}`}>{value}</div>
        <Link href={href} className="text-[11px] font-bold text-[#38bdf8] hover:underline mt-1.5 block">
          {link} →
        </Link>
      </div>
      <span className={`material-symbols-outlined text-3xl ${color}`}>{icon}</span>
    </div>
  );
}

function SalesCard({ title, data }: { title: string; data: SalesSummary }) {
  return (
    <div className="bg-[#10121a] p-5 rounded-2xl border border-[#1c1f2b] flex flex-col gap-1">
      <span className="text-xs font-semibold text-[#64748b]">{title}</span>
      <div className="font-display font-black text-2xl text-white">{formatTRY(data.gmv)}</div>
      <div className="text-[11px] text-[#94a3b8]">
        {data.orders} sipariş · <span className="text-emerald-400">{formatTRY(data.commission)} komisyon</span>
      </div>
    </div>
  );
}

/** Son günlerin ciro grafiği (bağımlılıksız, CSS çubuk grafik) */
function DailyChart({ daily }: { daily: NonNullable<DashboardReport['finance']>['daily'] }) {
  const max = Math.max(1, ...daily.map((d) => d.gmv));
  return (
    <div className="bg-[#10121a] p-5 rounded-2xl border border-[#1c1f2b] flex flex-col gap-4">
      <h2 className="text-sm font-bold text-white">Son {daily.length} Gün · Günlük Ciro</h2>
      <div className="flex items-end gap-1.5 h-40" role="img" aria-label="Günlük ciro grafiği">
        {daily.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
            <div
              className="w-full rounded-t-md bg-[#2563eb]/70 group-hover:bg-[#38bdf8] transition-colors min-h-[2px]"
              style={{ height: `${(d.gmv / max) * 100}%` }}
            />
            <span className="text-[9px] text-[#475569]">{d.date.slice(8, 10)}</span>
            <div className="absolute bottom-full mb-1 hidden group-hover:block whitespace-nowrap px-2 py-1 rounded-lg bg-[#0b0c12] border border-[#1c1f2b] text-[10px] text-white z-10">
              {d.date} · {formatTRY(d.gmv)} · {d.orders} sipariş
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard({ report }: { report: DashboardReport }) {
  const { pending, finance } = report;
  const queue = [
    { label: 'Bekleyen Para Çekme', value: pending.withdrawals, href: '/panel/finans', link: 'Finans', icon: 'account_balance', color: 'text-amber-400' },
    { label: 'Bekleyen Havale Bildirimi', value: pending.deposits, href: '/panel/finans', link: 'Finans', icon: 'add_card', color: 'text-emerald-400' },
    { label: 'Onay Bekleyen İlan', value: pending.listings, href: '/panel/urunler', link: 'İlanları İncele', icon: 'fact_check', color: 'text-[#38bdf8]' },
    { label: 'Hakem Bekleyen İtiraz', value: pending.disputes, href: '/panel/itirazlar', link: 'İtirazlara Git', icon: 'balance', color: 'text-rose-400' },
    { label: 'Açık Destek Talebi', value: pending.tickets, href: '/panel/destek', link: 'Destek Masası', icon: 'headset_mic', color: 'text-purple-400' },
    { label: 'Satıcı Başvurusu', value: pending.sellerRequests, href: '/panel/kullanicilar', link: 'Başvuruları İncele', icon: 'badge', color: 'text-amber-400' },
  ];

  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-white">Yönetim Merkezi</h1>
        <p className="text-xs sm:text-sm text-[#94a3b8] mt-1">Bekleyen işler, satış ve finans özeti.</p>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {queue.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </section>

      {finance && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SalesCard title="Bugün" data={finance.sales.today} />
            <SalesCard title="Son 7 Gün" data={finance.sales.last7Days} />
            <SalesCard title="Son 30 Gün" data={finance.sales.last30Days} />
          </section>

          <DailyChart daily={finance.daily} />

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Havuzdaki Tutar (Escrow)', value: formatTRY(finance.escrowHeld), color: 'text-amber-300' },
              { label: 'Gerçekleşen Komisyon', value: formatTRY(finance.realizedCommission), color: 'text-emerald-400' },
              { label: 'Bloke Para Çekme', value: formatTRY(finance.pendingWithdrawals), color: 'text-rose-300' },
              {
                label: 'Kullanıcı / Satıcı',
                value: `${finance.counts.users} / ${finance.counts.sellers}`,
                color: 'text-white',
              },
            ].map((m) => (
              <div key={m.label} className="bg-[#10121a] p-5 rounded-2xl border border-[#1c1f2b]">
                <div className="text-[11px] text-[#64748b] font-bold uppercase tracking-wider">{m.label}</div>
                <div className={`font-display font-black text-xl mt-1 ${m.color}`}>{m.value}</div>
              </div>
            ))}
          </section>
          <p className="text-[11px] text-[#475569]">
            Ciro, iade edilen siparişler hariç tüm siparişlerin toplamıdır. Komisyon, satış anında sabitlenen tutardır; alıcı onayından sonra gerçekleşir.
            Aktif ilan: {finance.counts.activeListings} · Aktif mağaza: {finance.counts.stores}
          </p>
        </>
      )}
    </div>
  );
}
