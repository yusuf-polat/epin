import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPageShell } from '@/features/info/components/InfoPageShell';
import { FAQ_GROUPS } from '@/features/info/constants';

export const metadata: Metadata = {
  title: 'Sık Sorulan Sorular | NexusPin',
  description: 'NexusPin P2P e-pin pazar yerinde teslimat, escrow, itiraz, ödeme yöntemleri, satıcılık ve hesap güvenliği hakkında sık sorulan sorular.',
  alternates: { canonical: '/sss' },
};

/** Arama motorları için FAQPage yapılandırılmış verisi */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_GROUPS.flatMap((g) => g.items).map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

export default function FaqPage() {
  return (
    <InfoPageShell active="/sss" title="Sık Sorulan Sorular" subtitle="Alışveriş, ödeme, satıcılık ve hesap güvenliği hakkında merak ettikleriniz.">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {FAQ_GROUPS.map((group) => (
          <section key={group.title} className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-3">
            <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#38bdf8]">{group.icon}</span>
              {group.title}
            </h2>
            <div className="flex flex-col divide-y divide-[#1c1f2b]">
              {group.items.map((item) => (
                <details key={item.q} className="group py-3">
                  <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-semibold text-white">
                    {item.q}
                    <span className="material-symbols-outlined text-[#64748b] transition-transform group-open:rotate-180">expand_more</span>
                  </summary>
                  <p className="text-xs text-[#94a3b8] leading-relaxed mt-2">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="p-5 rounded-2xl bg-[#10121a] border border-[#1c1f2b] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-[#94a3b8]">Aradığınız yanıtı bulamadınız mı?</p>
        <Link href="/iletisim" className="px-5 py-2.5 rounded-xl bg-[#2563eb] text-white text-xs font-bold text-center">
          Bize Ulaşın
        </Link>
      </div>
    </InfoPageShell>
  );
}
