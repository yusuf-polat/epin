import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { InfoPageShell } from '@/features/info/components/InfoPageShell';

export const metadata: Metadata = {
  title: 'Hakkımızda | NexusPin',
  description: 'NexusPin, dijital kod ve e-pin alıcılarıyla satıcılarını escrow güvencesiyle buluşturan P2P pazar yeridir.',
  alternates: { canonical: '/hakkimizda' },
};

const PRINCIPLES = [
  { icon: 'shield', title: 'Escrow güvencesi', desc: 'Ödeme, alıcı teslimatı onaylayana kadar güvenli havuzda tutulur; satıcıya ancak sonra aktarılır.' },
  { icon: 'gavel', title: 'Tarafsız hakemlik', desc: 'Çalışmayan kod veya teslim edilmeyen siparişlerde itiraz süreci ve hakem ekibi devreye girer.' },
  { icon: 'fact_check', title: 'Denetlenen ilanlar', desc: 'Satıcılar başvuruyla kabul edilir, her ilan yayına girmeden önce incelenir; şikâyetler takip edilir.' },
  { icon: 'lock', title: 'Hesap güvenliği', desc: 'HttpOnly oturum, iki adımlı doğrulama, işlem geçmişi ve şifreli saklanan ödeme anahtarları.' },
];

export default function AboutPage() {
  const { company } = siteConfig;
  return (
    <InfoPageShell
      active="/hakkimizda"
      title="Hakkımızda"
      subtitle="NexusPin, oyun kodları, hediye kartları ve dijital abonelikler için alıcılarla satıcıları güvenli şekilde buluşturan bir P2P pazar yeridir."
    >
      <section className="bg-[#10121a] rounded-2xl p-6 md:p-8 border border-[#1c1f2b] flex flex-col gap-4 text-sm text-[#94a3b8] leading-relaxed">
        <p>
          Dijital ürün alışverişinde en büyük sorun güvendir: alıcı kodun çalışacağından, satıcı ödemenin geleceğinden emin olmak ister. NexusPin bu iki tarafın arasında
          durur. Alıcının ödemesi teslimat onaylanana kadar bizde bekler; kod çalışmazsa itiraz süreciyle iade veya değişim sağlanır, satıcı ise onaylanan her satışın
          karşılığını komisyon düşülerek cüzdanında görür ve banka hesabına çekebilir.
        </p>
        <p>
          Platformdaki ilanların büyük bölümü bağımsız satıcılara aittir. NexusPin, {company.legalName} tarafından işletilen bir aracı hizmet sağlayıcıdır; satış
          sözleşmesi alıcı ile satıcı arasında kurulur. Ayrıntılar için{' '}
          <Link href="/sozlesmeler/kullanim-kosullari" className="text-[#38bdf8] hover:underline">
            Kullanım Koşulları
          </Link>{' '}
          ve{' '}
          <Link href="/sozlesmeler/mesafeli-satis-sozlesmesi" className="text-[#38bdf8] hover:underline">
            Mesafeli Satış Sözleşmesi
          </Link>
          &apos;ni inceleyebilirsiniz.
        </p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="bg-[#10121a] rounded-2xl p-5 border border-[#1c1f2b] flex gap-4">
            <span className="material-symbols-outlined text-2xl text-[#38bdf8]">{p.icon}</span>
            <div>
              <h2 className="font-bold text-sm text-white">{p.title}</h2>
              <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/katalog" className="px-5 py-3 rounded-xl bg-[#2563eb] text-white text-xs font-bold text-center">
          Kataloğu Keşfet
        </Link>
        <Link href="/hesabim/satici-basvuru" className="px-5 py-3 rounded-xl bg-[#161824] border border-[#222534] text-white text-xs font-bold text-center">
          Satıcı Ol
        </Link>
      </div>
    </InfoPageShell>
  );
}
