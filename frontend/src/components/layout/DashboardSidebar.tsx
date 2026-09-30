'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { formatTRY } from '@/lib/utils/format';
import { accountNav, isNavActive, panelNav } from '@/config/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useLogout } from '@/features/auth/hooks/useAuthMutations';
import { UserAvatar } from '@/components/ui/UserAvatar';

const ROLE_LABELS = { ADMIN: 'YÖNETİCİ', DESTEK: 'DESTEK EKİBİ', USER: 'KULLANICI' } as const;

export default function DashboardSidebar({ variant }: { variant: 'account' | 'panel' }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { mutateAsync: logout } = useLogout();
  if (!user) return null;

  const items = variant === 'panel' ? panelNav(user) : accountNav(user);
  const isSeller = user.canSell || user.role === 'ADMIN';

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  return (
    <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
      <div className="bg-[#10121a] rounded-2xl p-5 border border-[#1c1f2b] shadow-lg flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-sm text-white truncate">{user.name}</h3>
            <p className="text-xs text-[#94a3b8] truncate">{user.email}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {user.role !== 'USER' && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    user.role === 'ADMIN' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  }`}
                >
                  {ROLE_LABELS[user.role]}
                </span>
              )}
              {user.canSell && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SATICI</span>
              )}
            </div>
          </div>
        </div>

        {variant === 'account' && (
          <div className="p-3.5 rounded-xl bg-[#090a0f] border border-[#1c1f2b] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-[#64748b]">Cüzdan Bakiyesi</div>
              <div className="font-display font-extrabold text-base text-white">{formatTRY(user.walletBalance)}</div>
            </div>
            <Link href="/hesabim/cuzdan" className="px-2.5 py-1.5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[11px] font-bold transition-all">
              Cüzdanım
            </Link>
          </div>
        )}
      </div>

      <nav className="bg-[#10121a] rounded-2xl p-3 border border-[#1c1f2b] shadow-lg flex flex-col gap-1" aria-label={variant === 'panel' ? 'Yönetim menüsü' : 'Hesap menüsü'}>
        {variant === 'panel' && <div className="px-3 py-1.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Yönetim Araçları</div>}
        {items.map((item) => {
          const active = isNavActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                active ? 'bg-[#2563eb] text-white shadow-md' : 'text-[#94a3b8] hover:bg-[#161924] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                {item.label}
              </span>
              {item.badge && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${active ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {variant === 'account' && !isSeller && user.role === 'USER' && (
          <Link
            href="/hesabim/satici-basvuru"
            className="mt-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition-all border border-dashed border-amber-500/30"
          >
            <span className="material-symbols-outlined text-lg">storefront</span>
            Satıcı Başvurusu Yap
          </Link>
        )}

        <div className="pt-2 mt-2 border-t border-[#1c1f2b] flex flex-col gap-1">
          {variant === 'panel' && (
            <Link href="/hesabim" className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#94a3b8] hover:bg-[#161924] hover:text-white">
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Hesabıma Dön
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all text-left"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Güvenli Çıkış Yap
          </button>
        </div>
      </nav>
    </aside>
  );
}
