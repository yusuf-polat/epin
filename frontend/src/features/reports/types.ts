export interface SalesSummary {
  orders: number;
  gmv: number;
  commission: number;
}

export interface DashboardReport {
  pending: {
    listings: number;
    disputes: number;
    tickets: number;
    sellerRequests: number;
    deposits: number;
    withdrawals: number;
  };
  /** Yalnızca rapor yetkisi olanlara döner */
  finance: {
    counts: { users: number; sellers: number; activeListings: number; stores: number };
    sales: { today: SalesSummary; last7Days: SalesSummary; last30Days: SalesSummary };
    escrowHeld: number;
    realizedCommission: number;
    pendingWithdrawals: number;
    daily: { date: string; orders: number; gmv: number; commission: number }[];
  } | null;
}
