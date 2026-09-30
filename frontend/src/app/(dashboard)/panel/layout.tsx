import Link from 'next/link';
import { redirect } from 'next/navigation';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import { getSessionUser } from '@/features/auth/server';
import { isStaff } from '@/features/auth/types';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/auth/login?redirect=/panel');
  // Arayüz koruması; asıl yetki kontrolü her endpoint'te backend'de yapılır
  if (!isStaff(user)) redirect('/hesabim');

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#64748b] mb-6">
        <Link href="/" className="hover:text-[#38bdf8]">Ana Sayfa</Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <Link href={user.role === 'ADMIN' ? '/panel' : '/panel/destek'} className="hover:text-[#38bdf8]">Yönetim Paneli</Link>
      </div>
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <DashboardSidebar variant="panel" />
        <div className="flex-1 w-full min-w-0">{children}</div>
      </div>
    </div>
  );
}
