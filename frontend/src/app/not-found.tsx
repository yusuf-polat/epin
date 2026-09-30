import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center flex flex-col items-center gap-4">
      <span className="font-display font-black text-6xl text-[#38bdf8]">404</span>
      <h1 className="font-display font-extrabold text-2xl text-white">Sayfa bulunamadı</h1>
      <p className="text-sm text-[#94a3b8]">Aradığınız sayfa kaldırılmış, adı değiştirilmiş veya hiç var olmamış olabilir.</p>
      <div className="flex gap-3">
        <Link href="/" className="px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold">
          Ana Sayfa
        </Link>
        <Link href="/katalog" className="px-5 py-2.5 rounded-xl bg-[#161824] border border-[#222534] text-white text-xs font-bold">
          Kataloğa Git
        </Link>
      </div>
    </div>
  );
}
