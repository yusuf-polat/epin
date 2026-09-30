import { redirect } from 'next/navigation';
import { withSessionCookie } from '@/lib/auth/session';
import { apiClient } from '@/lib/api';
import { getSessionUser } from '@/features/auth/server';
import AccountOverview from '@/features/users/components/AccountOverview';
import type { Order } from '@/features/orders/types';
import type { DigitalPin } from '@/features/pins/types';
import type { NotificationItem } from '@/features/notifications/types';

export const metadata = { title: 'Hesabım | NexusPin' };

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth/login?redirect=/hesabim');
  if (user.role === 'DESTEK') redirect('/panel/destek');

  const opts = withSessionCookie();
  const isSeller = user.canSell || user.role === 'ADMIN';
  const [orders, pins, notifications, pendingSales] = await Promise.all([
    apiClient.getPage<Order>('/orders', { ...opts, params: { limit: 20 } }).catch(() => null),
    // Yalnızca toplam sayılar gerekir
    apiClient.getPage<DigitalPin>('/pins', { ...opts, params: { limit: 1 } }).catch(() => null),
    apiClient.getPage<NotificationItem>('/notifications', { ...opts, params: { limit: 3 } }).catch(() => null),
    isSeller ? apiClient.getPage<Order>('/orders/sales', { ...opts, params: { filter: 'pending', limit: 1 } }).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <AccountOverview
      user={user}
      orders={orders?.items ?? []}
      pinCount={pins?.meta.total ?? 0}
      notifications={notifications?.items ?? []}
      pendingSales={pendingSales?.meta.total ?? 0}
    />
  );
}
