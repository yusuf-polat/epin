import Link from 'next/link';

const INFO_LINKS = [
  { href: '/hakkimizda', label: 'Hakkımızda' },
  { href: '/sss', label: 'Sık Sorulan Sorular' },
  { href: '/iletisim', label: 'İletişim' },
];

/** Kurumsal bilgi sayfalarının ortak düzeni */
export function InfoPageShell({ active, title, subtitle, children }: { active: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <nav aria-label="Kurumsal" className="flex gap-2 overflow-x-auto">
          {INFO_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.href === active ? 'page' : undefined}
              className={`px-3 py-2 rounded-xl text-xs font-bold border shrink-0 ${
                l.href === active ? 'bg-[#2563eb] border-[#2563eb] text-white' : 'bg-[#10121a] border-[#1c1f2b] text-[#94a3b8] hover:text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div>
          <h1 className="font-display font-black text-3xl text-white">{title}</h1>
          <p className="text-sm text-[#94a3b8] mt-2 max-w-2xl">{subtitle}</p>
        </div>
      </header>
      {children}
    </div>
  );
}
