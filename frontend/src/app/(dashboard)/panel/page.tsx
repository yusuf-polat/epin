import { redirect } from 'next/navigation';
import { withSessionCookie } from '@/lib/auth/session';
import { getErrorMessage } from '@/lib/api';
import { ErrorState } from '@/components/shared/ErrorState';
import { getSessionUser } from '@/features/auth/server';
import AdminDashboard from '@/features/reports/components/AdminDashboard';
import { reportApi } from '@/features/reports/services/report.api';

export const metadata = { title: 'Yönetim Paneli | NexusPin' };

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth/login?redirect=/panel');
  if (user.role !== 'ADMIN') redirect('/panel/destek');

  try {
    const report = await reportApi.dashboard(withSessionCookie());
    return <AdminDashboard report={report} />;
  } catch (err) {
    return <ErrorState message={getErrorMessage(err, 'Panel verileri yüklenemedi')} />;
  }
}
