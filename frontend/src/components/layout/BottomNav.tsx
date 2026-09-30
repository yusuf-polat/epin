'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Ana Sayfa', href: '/', icon: 'home' },
    { label: 'Katalog', href: '/katalog', icon: 'grid_view' },
    { label: 'Sepetim', href: '/sepet', icon: 'shopping_bag' },
    { label: 'Kodlarım', href: '/hesabim/kodlarim', icon: 'vpn_key' },
    { label: 'Hesabım', href: '/hesabim', icon: 'account_circle' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#090a0f]/95 backdrop-blur-xl border-t border-[#1a1c26] shadow-2xl xl:hidden py-1.5 px-3">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-[#38bdf8]' : 'text-[#64748b] hover:text-white'
              }`}
            >
              <span
                className={`material-symbols-outlined text-2xl transition-transform ${
                  isActive ? 'scale-110 font-bold' : ''
                }`}
              >
                {item.icon}
              </span>
              <span className={`text-[11px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
