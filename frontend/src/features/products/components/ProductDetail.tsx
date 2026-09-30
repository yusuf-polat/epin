import Link from 'next/link';
import { Product } from '../types';
import { deliveryLabel } from '../constants';
import ProductGallery from './ProductGallery';
import ProductPurchasePanel from './ProductPurchasePanel';
import ProductReviewSection from './ProductReviewSection';
import ReportButton from '@/features/complaints/components/ReportButton';

export default function ProductDetail({ product }: { product: Product }) {
  const isManual = product.deliveryType === 'MANUAL';

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#64748b] mb-6">
        <Link href="/" className="hover:text-[#38bdf8]">Ana Sayfa</Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <Link href="/katalog" className="hover:text-[#38bdf8]">Katalog</Link>
        {product.category && (
          <>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <Link href={`/katalog?cat=${product.category.slug}`} className="hover:text-[#38bdf8]">{product.category.name}</Link>
          </>
        )}
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-white font-bold truncate max-w-xs">{product.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <ProductGallery
            imageUrl={product.imageUrl}
            galleryUrls={product.galleryUrls}
            title={product.title}
            brand={product.brand}
            region={product.region}
            deliveryLabel={deliveryLabel(product.deliveryType, isManual ? product.deliveryDeadlineHours : undefined)}
          />

          <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] shadow-xl flex flex-col gap-4">
            <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#38bdf8]">info</span>
              Ürün Açıklaması
            </h2>
            <p className="text-sm text-[#94a3b8] leading-relaxed whitespace-pre-line">{product.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#1c1f2b]">
              {[
                { icon: isManual ? 'schedule' : 'download_done', title: isManual ? 'Satıcı Teslimatı' : 'Anında Teslimat', desc: isManual ? `${product.deliveryDeadlineHours} saat içinde` : 'Ödeme sonrası otomatik' },
                { icon: 'shield', title: 'Escrow Koruması', desc: 'Onayınıza kadar ödeme havuzda' },
                { icon: 'gavel', title: 'İtiraz Hakkı', desc: 'Sorunlu kodda hakem desteği' },
              ].map((f) => (
                <div key={f.title} className="flex items-center gap-2.5 p-3 rounded-xl bg-[#161824] border border-[#222534]">
                  <span className="material-symbols-outlined text-[#38bdf8]">{f.icon}</span>
                  <div className="text-xs">
                    <div className="font-bold text-white">{f.title}</div>
                    <div className="text-[#94a3b8]">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {product.deliveryInstructions && (
            <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] shadow-xl flex flex-col gap-3">
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#38bdf8]">local_shipping</span>
                Teslimat Bilgisi
              </h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed whitespace-pre-line">{product.deliveryInstructions}</p>
            </div>
          )}

          <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] shadow-xl flex flex-col gap-3">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#38bdf8]">help</span>
              Nasıl Çalışır?
            </h3>
            <ol className="list-decimal list-inside text-xs text-[#94a3b8] space-y-2 leading-relaxed">
              <li>Cüzdan bakiyenizle ödemeyi tamamlayın; tutar güvenli havuzda (escrow) tutulur.</li>
              <li>
                {isManual
                  ? 'Satıcı, belirtilen süre içinde ürünü teslim eder. Teslim edilmezse ödemeniz otomatik iade edilir.'
                  : 'Kodunuz anında "Dijital Kodlarım" sayfanıza eklenir.'}
              </li>
              <li>Kodu kontrol edip siparişi onaylayın; ödeme satıcıya aktarılır. Sorun varsa video kanıtla itiraz açabilirsiniz.</li>
              <li>Onay vermezseniz, teslimattan belirli bir süre sonra ödeme otomatik olarak satıcıya aktarılır.</li>
            </ol>
          </div>

          <ProductReviewSection slug={product.slug} sellerId={product.sellerId} />
          {product.sellerId && (
            <div className="flex justify-end">
              <ReportButton targetType="PRODUCT" targetId={product.id} ownerId={product.sellerId} />
            </div>
          )}
        </div>

        <div className="lg:col-span-5 lg:sticky top-28">
          <ProductPurchasePanel product={product} />
        </div>
      </div>
    </div>
  );
}
