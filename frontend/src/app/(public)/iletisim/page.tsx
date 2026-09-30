import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { InfoPageShell } from '@/features/info/components/InfoPageShell';

export const metadata: Metadata = {
  title: 'İletişim | NexusPin',
  description: 'NexusPin destek ekibine ve şirket bilgilerine ulaşın: destek talebi, e-posta, telefon ve adres.',
  alternates: { canonical: '/iletisim' },
};

export default function ContactPage() {
  const { company } = siteConfig;
  const channels = [
    { icon: 'support_agent', title: 'Destek Talebi', value: 'Sipariş, ödeme ve hesap sorunları için en hızlı yol', href: '/hesabim/destek', cta: 'Talep Oluştur' },
    { icon: 'mail', title: 'E-posta', value: company.email, href: `mailto:${company.email}`, cta: 'E-posta Gönder' },
    { icon: 'call', title: 'Telefon', value: company.phone, href: `tel:${company.phone.replace(/\s/g, '')}`, cta: 'Ara' },
  ];

  return (
    <InfoPageShell active="/iletisim" title="İletişim" subtitle={company.supportHours}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {channels.map((c) => (
          <div key={c.title} className="bg-[#10121a] rounded-2xl p-5 border border-[#1c1f2b] flex flex-col gap-3">
            <span className="material-symbols-outlined text-2xl text-[#38bdf8]">{c.icon}</span>
            <div>
              <h2 className="font-bold text-sm text-white">{c.title}</h2>
              <p className="text-xs text-[#94a3b8] mt-1 break-words">{c.value}</p>
            </div>
            <Link href={c.href} className="mt-auto px-4 py-2 rounded-xl bg-[#161824] border border-[#222534] text-[#38bdf8] text-xs font-bold text-center">
              {c.cta}
            </Link>
          </div>
        ))}
      </div>

      <section className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-3">
        <h2 className="font-display font-bold text-base text-white">Şirket Bilgileri</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-4 gap-y-2 text-xs">
          {[
            ['Unvan', company.legalName],
            ['Adres', company.address],
            ['MERSİS No', company.mersisNo],
            ['Vergi Dairesi / No', company.taxOffice],
            ['KVKK başvuruları', company.kvkkEmail],
          ].map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-[#64748b]">{label}</dt>
              <dd className="text-white break-words">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[11px] text-[#64748b]">
          Kişisel verilerinize ilişkin talepleriniz için{' '}
          <Link href="/sozlesmeler/kvkk-aydinlatma-metni" className="text-[#38bdf8] hover:underline">
            KVKK Aydınlatma Metni
          </Link>
          &apos;ni inceleyiniz. Sık sorulan sorular için{' '}
          <Link href="/sss" className="text-[#38bdf8] hover:underline">
            SSS
          </Link>{' '}
          sayfasına göz atabilirsiniz.
        </p>
      </section>
    </InfoPageShell>
  );
}
