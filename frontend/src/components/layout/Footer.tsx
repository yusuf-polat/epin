import Link from 'next/link';
import { LEGAL_LINKS } from '@/features/legal/constants';
import { Logo } from '@/components/ui/Logo';

const categoryLinks = [
  { href: '/katalog?cat=oyunlar', label: 'Oyunlar & CD-Key' },
  { href: '/katalog?cat=hediye-kartlari', label: 'Hediye Kartları' },
  { href: '/katalog?cat=oyun-ici-bakiye', label: 'Oyun İçi Bakiye / VP & RP' },
  { href: '/katalog?cat=mobil-oyunlar', label: 'Mobil Oyunlar & UC' },
];

const infoLinks = [
  { href: '/hakkimizda', label: 'Hakkımızda' },
  { href: '/sss', label: 'Sık Sorulan Sorular' },
  { href: '/iletisim', label: 'İletişim' },
  { href: '/magazalar', label: 'Mağazalar' },
];

const accountLinks = [
  { href: '/hesabim/kodlarim', label: 'Dijital Kodlarım' },
  { href: '/hesabim/siparislerim', label: 'Siparişlerim' },
  { href: '/hesabim/destek', label: 'Destek Talepleri' },
  { href: '/hesabim/satici-basvuru', label: 'Satıcı Ol' },
];

export default function Footer() {
  return (
    <footer className="w-full bg-[#06070a] text-[#94a3b8] pt-16 pb-24 xl:pb-16 border-t border-[#151722]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 pb-12 border-b border-[#151722]">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Logo />
            <p className="text-sm text-[#94a3b8] max-w-sm leading-relaxed">
              Dijital kod ve e-pin alıcılarıyla satıcılarını buluşturan P2P pazar yeri. Ödemeler, alıcı teslimatı onaylayana kadar güvenli
              havuzda (escrow) tutulur.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Popüler Kategoriler</h4>
            {categoryLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm text-[#94a3b8] hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Kurumsal</h4>
            {infoLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm text-[#94a3b8] hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Hesabım</h4>
            {accountLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm text-[#94a3b8] hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Güvenli Alışveriş</h4>
            <ul className="flex flex-col gap-2 text-xs text-[#94a3b8]">
              {['Escrow korumalı ödeme', 'Video kanıtla itiraz hakkı', 'Teslim edilmeyen siparişte otomatik iade', 'Kart, kripto ve havale ile bakiye'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#64748b]">
          <div>© {new Date().getFullYear()} NexusPin Dijital Ürün Platformu. Tüm hakları saklıdır.</div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-white">
                {l.label}
              </Link>
            ))}
            <Link href="/iletisim" className="hover:text-white">İletişim & Destek</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
