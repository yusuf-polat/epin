import Link from 'next/link';
import { redirect } from 'next/navigation';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import { getSessionUser } from '@/features/auth/server';
import EmailVerificationBanner from '@/features/auth/components/EmailVerificationBanner';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/auth/login?redirect=/hesabim');

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#64748b] mb-6">
        <Link href="/" className="hover:text-[#38bdf8]">Ana Sayfa</Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <Link href="/hesabim" className="hover:text-[#38bdf8]">Hesabım</Link>
      </div>
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <DashboardSidebar variant="account" />
        <div className="flex-1 w-full min-w-0">
          <EmailVerificationBanner />
          {children}
        </div>
      </div>
    </div>
  );
}
