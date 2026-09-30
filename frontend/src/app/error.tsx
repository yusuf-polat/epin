'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center flex flex-col items-center gap-4">
      <span className="material-symbols-outlined text-5xl text-rose-400">error</span>
      <h1 className="font-display font-extrabold text-2xl text-white">Bir şeyler ters gitti</h1>
      <p className="text-sm text-[#94a3b8]">Sayfa yüklenirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz.</p>
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold">
          Tekrar Dene
        </button>
        <Link href="/" className="px-5 py-2.5 rounded-xl bg-[#161824] border border-[#222534] text-white text-xs font-bold">
          Ana Sayfa
        </Link>
      </div>
    </div>
  );
}
