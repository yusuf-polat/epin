import { Role } from '@prisma/client';
import { toNumber } from '@/utils/money';
import { hasPermission } from '@/modules/permissions/permission.service';
import { reportRepository } from './report.repository';
import { DAILY_SERIES_DAYS } from './report.constants';

const DAY_MS = 86_400_000;

function startOfTodayIstanbul(now = new Date()) {
  // İstanbul UTC+3 (yaz saati uygulanmıyor)
  const shifted = new Date(now.getTime() + 3 * 3_600_000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - 3 * 3_600_000);
}

const toSales = (s: Awaited<ReturnType<typeof reportRepository.salesSince>>) => ({
  orders: s.orders,
  gmv: toNumber(s.gmv),
  commission: toNumber(s.commission),
});

/** Eksik günleri sıfırla doldurur (grafik için sürekli seri) */
export function fillDailySeries(rows: { day: Date; orders: number; gmv: number; commission: number }[], days: number, now = new Date()) {
  const byDay = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), r]));
  const start = startOfTodayIstanbul(now);
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(start.getTime() - (days - 1 - i) * DAY_MS + 3 * 3_600_000).toISOString().slice(0, 10);
    const row = byDay.get(date);
    return { date, orders: row?.orders ?? 0, gmv: row?.gmv ?? 0, commission: row?.commission ?? 0 };
  });
}

export const reportService = {
  /** Panel ana sayfası: bekleyen işler herkese, finansal özet yalnızca yetkililere */
  async dashboard(viewer: { role: Role }) {
    const canSeeFinance = viewer.role === 'ADMIN' || (await hasPermission(viewer.role, 'view_reports'));
    const pending = await reportRepository.pendingWork();
    if (!canSeeFinance) return { pending, finance: null };

    const today = startOfTodayIstanbul();
    const [counts, day, week, month, money, daily] = await Promise.all([
      reportRepository.platformCounts(),
      reportRepository.salesSince(today),
      reportRepository.salesSince(new Date(today.getTime() - 6 * DAY_MS)),
      reportRepository.salesSince(new Date(today.getTime() - 29 * DAY_MS)),
      reportRepository.moneyInFlight(),
      reportRepository.dailySales(DAILY_SERIES_DAYS),
    ]);

    return {
      pending,
      finance: {
        counts,
        sales: { today: toSales(day), last7Days: toSales(week), last30Days: toSales(month) },
        escrowHeld: toNumber(money.escrowHeld),
        realizedCommission: toNumber(money.realizedCommission),
        pendingWithdrawals: toNumber(money.pendingWithdrawals),
        daily: fillDailySeries(
          daily.map((r) => ({ day: r.day, orders: Number(r.orders), gmv: toNumber(r.gmv), commission: toNumber(r.commission) })),
          DAILY_SERIES_DAYS
        ),
      },
    };
  },
};
