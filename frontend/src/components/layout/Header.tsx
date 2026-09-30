'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { formatTRY } from '@/lib/utils/format';
import { accountNav } from '@/config/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useLogout } from '@/features/auth/hooks/useAuthMutations';
import { useCart } from '@/features/cart/hooks/useCart';
import NotificationBell from '@/features/notifications/components/NotificationBell';
import { UserAvatar } from '@/components/ui/UserAvatar';
import HeaderSearch from './HeaderSearch';
import { Logo } from '@/components/ui/Logo';

const mainLinks = [
  { href: '/', label: 'Ana Sayfa', icon: null, exact: true },
  { href: '/magazalar', label: 'Mağazalar', icon: 'store', exact: false },
  { href: '/katalog', label: 'E-Pin Kataloğu', icon: null, exact: false },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { mutateAsync: logout } = useLogout();
  const { count, total } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#090a0f]/95 backdrop-blur-xl border-b border-[#161822] shadow-xl">
      <div className="h-16 max-w-[1400px] mx-auto px-4 sm:px-8 flex items-center justify-between gap-4">
        <Link href="/" aria-label="NexusPin ana sayfa" className="shrink-0">
          <Logo showTagline />
        </Link>

        <nav className="hidden lg:flex items-center gap-1 bg-[#10121a] p-1 rounded-xl border border-[#1b1e2a]">
          {mainLinks.map((l) => {
            const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  active ? 'bg-[#2563eb] text-white shadow-sm' : 'text-[#94a3b8] hover:text-white hover:bg-[#161824]'
                }`}
              >
                {l.icon && <span className="material-symbols-outlined text-sm text-[#38bdf8]">{l.icon}</span>}
                {l.label}
              </Link>
            );
          })}
        </nav>

        <Suspense fallback={<div className="hidden md:block flex-1 max-w-sm" />}>
          <HeaderSearch />
        </Suspense>

        <div className="flex items-center gap-2 sm:gap-3">
          {user && <NotificationBell />}

          <Link
            href="/sepet"
            aria-label={`Sepet (${count} ürün)`}
            className="flex items-center gap-2 p-2 px-3 rounded-xl bg-[#10121a] hover:bg-[#161824] border border-[#1b1e2a] hover:border-[#38bdf8]/50 text-white transition-all group"
          >
            <div className="relative">
              <span className="material-symbols-outlined text-xl text-[#38bdf8]">shopping_bag</span>
              {count > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-0.5 rounded-full bg-[#2563eb] text-white text-[9px] flex items-center justify-center font-bold">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </div>
            <span className="hidden sm:inline-block text-xs font-bold text-[#cbd5e1]">{formatTRY(total)}</span>
          </Link>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-[#10121a] border border-[#1b1e2a] hover:border-[#2563eb] text-left transition-all"
              >
                <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-bold text-white leading-tight truncate max-w-[110px]">{user.name}</span>
                  <span className="text-[10px] font-mono text-[#10b981] font-semibold">{formatTRY(user.walletBalance)}</span>
                </div>
                <span className="material-symbols-outlined text-base text-[#64748b]">{menuOpen ? 'expand_less' : 'expand_more'}</span>
              </button>

              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-60 bg-[#0e1017] border border-[#1c1f2b] rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1">
                  <div className="p-3 border-b border-[#1c1f2b] mb-1">
                    <div className="text-xs font-bold text-white truncate">{user.name}</div>
                    <div className="text-[11px] text-[#64748b] truncate">{user.email}</div>
                    <div className="mt-2 p-2 rounded-lg bg-[#141620] flex items-center justify-between">
                      <span className="text-[10px] text-[#64748b] uppercase font-bold">{user.role === 'USER' ? 'Cüzdan' : user.role}</span>
                      <span className="text-xs font-bold text-[#10b981]">{formatTRY(user.walletBalance)}</span>
                    </div>
                  </div>

                  <div className="max-h-[50vh] overflow-y-auto flex flex-col gap-0.5">
                    {accountNav(user).map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#cbd5e1] hover:bg-[#141620] hover:text-white transition-colors"
                      >
                        <span className="material-symbols-outlined text-base text-[#38bdf8]">{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  <div className="h-px bg-[#1c1f2b] my-1" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors w-full text-left"
                  >
                    <span className="material-symbols-outlined text-base">logout</span>
                    Oturumu Kapat
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={`/auth/login${pathname !== '/' && !pathname.startsWith('/auth') ? `?redirect=${encodeURIComponent(pathname)}` : ''}`}
                className="px-3.5 py-1.5 rounded-xl border border-[#1b1e2a] text-xs font-bold text-white hover:bg-[#10121a] hover:border-[#38bdf8]/50 transition-all"
              >
                Giriş Yap
              </Link>
              <Link href="/auth/register" className="hidden sm:inline-block px-3.5 py-1.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all">
                Kayıt Ol
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
