'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/** Katalog araması: geniş ekranda header'da kutu, dar ekranda katalog sayfasına ikon */
export default function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = pathname === '/katalog' ? searchParams.get('search') ?? '' : '';
  const [query, setQuery] = useState(current);

  // Katalogdaki filtrelerden arama değişirse kutu da güncellenir
  useEffect(() => setQuery(current), [current]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/katalog?search=${encodeURIComponent(q)}` : '/katalog');
  };

  return (
    <>
      <form role="search" onSubmit={submit} className="hidden md:flex items-center flex-1 max-w-sm">
        <label className="relative w-full">
          <span className="sr-only">Ürün ara</span>
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base text-[#64748b]">search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
            placeholder="Oyun, hediye kartı, VP, UC ara..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#10121a] border border-[#1b1e2a] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8]"
          />
        </label>
      </form>
      <Link href="/katalog" aria-label="Ürün ara" className="md:hidden p-2 rounded-xl bg-[#10121a] border border-[#1b1e2a] text-[#38bdf8]">
        <span className="material-symbols-outlined text-xl">search</span>
      </Link>
    </>
  );
}
