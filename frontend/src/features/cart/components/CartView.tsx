'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getErrorMessage, isApiError } from '@/lib/api';
import { formatTRY } from '@/lib/utils/format';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCheckout } from '@/features/orders/hooks/useOrders';
import { legalHref } from '@/features/legal/constants';
import { ConsentCheckbox } from '@/components/ui/ConsentCheckbox';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { CheckoutResult } from '@/features/orders/types';
import { useCart } from '../hooks/useCart';

function CheckoutSuccess({ result }: { result: CheckoutResult }) {
  const { copy, copiedKey: copied } = useCopyToClipboard();
  const pins = result.orders.flatMap((o) => o.pins);
  const manualOrders = result.orders.filter((o) => o.deliveryType === 'MANUAL');

  return (
    <div className="bg-[#10121a] rounded-3xl p-8 border border-emerald-500/40 shadow-2xl max-w-2xl mx-auto flex flex-col items-center gap-6">
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl">check_circle</span>
      </div>

      <div className="text-center">
        <h2 className="font-display font-black text-2xl text-white">Ödeme Başarıyla Tamamlandı!</h2>
        <p className="text-xs text-[#94a3b8] max-w-md mt-1">
          Ödemeniz, teslimatı onaylayana kadar güvenli havuzda (escrow) tutulur. Kodları kontrol ettikten sonra siparişinizi onaylayınız.
        </p>
      </div>

      <div className="w-full bg-[#0d0e14] rounded-2xl p-5 border border-[#1c1f2b] flex flex-col gap-3">
        {result.orders.map((o) => (
          <div key={o.id} className="flex justify-between items-center text-xs text-[#64748b] pb-2 border-b border-[#1c1f2b]">
            <span>Sipariş #{o.orderNumber}</span>
            <span className="font-display font-bold text-sm text-emerald-400">{formatTRY(o.totalAmount)}</span>
          </div>
        ))}
        <div className="flex justify-between items-center text-xs text-[#64748b]">
          <span>Kalan Cüzdan Bakiyesi:</span>
          <span className="font-bold text-white">{formatTRY(result.walletBalance)}</span>
        </div>

        {pins.length > 0 && (
          <div className="flex flex-col gap-2 pt-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#38bdf8]">vpn_key</span>
              Teslim Edilen Kodlarınız:
            </span>
            {pins.map((pin) => (
              <div key={pin.id} className="p-3 bg-[#141620] rounded-xl border border-[#222534] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] text-[#64748b] truncate">{pin.productTitle}</div>
                  <div className="font-mono font-bold text-sm text-[#38bdf8] tracking-wide break-all">{pin.code}</div>
                </div>
                <button
                  type="button"
                  onClick={() => copy(pin.code, pin.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">{copied === pin.id ? 'check' : 'content_copy'}</span>
                  <span>{copied === pin.id ? 'Kopyalandı!' : 'Kopyala'}</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {manualOrders.length > 0 && (
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-xs text-amber-200">
            {manualOrders.length} sipariş satıcı teslimatı bekliyor. Satıcı teslim ettiğinde bildirim alacaksınız; süre içinde teslim edilmezse
            ödemeniz otomatik iade edilir.
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Link
          href="/hesabim/siparislerim"
          className="flex-1 py-3.5 px-4 rounded-xl bg-[#2563eb] text-white text-xs font-bold hover:bg-[#1d4ed8] transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">receipt_long</span>
          Siparişlerime Git
        </Link>
        <Link
          href="/katalog"
          className="flex-1 py-3.5 px-4 rounded-xl bg-[#141620] border border-[#222534] text-white text-xs font-bold hover:bg-[#1c1f2c] transition-all flex items-center justify-center"
        >
          Alışverişe Devam Et
        </Link>
      </div>
    </div>
  );
}

export default function CartView() {
  const router = useRouter();
  const { user } = useAuth();
  const { lines, total, setQuantity, remove } = useCart();
  const checkout = useCheckout();
  const loading = checkout.isPending;
  const [error, setError] = useState<{ message: string; insufficient: boolean } | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | undefined>();

  const walletBalance = user?.walletBalance ?? 0;
  const hasUnavailable = lines.some((l) => l.unavailableReason);

  const changeQuantity = async (variantId: string, quantity: number) => {
    setError(null);
    try {
      await setQuantity(variantId, quantity);
    } catch (err) {
      setError({ message: getErrorMessage(err), insufficient: false });
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      router.push('/auth/login?redirect=/sepet');
      return;
    }
    if (!acceptedTerms) {
      setTermsError('Ödemeye devam etmek için sözleşmeyi onaylamanız gerekir.');
      return;
    }
    if (walletBalance < total) {
      setError({
        message: `Cüzdan bakiyeniz yetersiz. Mevcut: ${formatTRY(walletBalance)}, Gereken: ${formatTRY(total)}.`,
        insufficient: true,
      });
      return;
    }
    setError(null);
    try {
      setResult(await checkout.mutateAsync(lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity }))));
    } catch (err) {
      setError({ message: getErrorMessage(err, 'Sipariş işlenirken bir sorun oluştu.'), insufficient: isApiError(err) && err.code === 'INSUFFICIENT_BALANCE' });
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#64748b] mb-6">
        <Link href="/" className="hover:text-[#38bdf8]">Ana Sayfa</Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-white">Sepet ve Güvenli Ödeme</span>
      </div>

      <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white mb-8">Sepet ve Güvenli Ödeme</h1>

      {result ? (
        <CheckoutSuccess result={result} />
      ) : lines.length === 0 ? (
        <div className="bg-[#10121a] rounded-3xl p-12 text-center border border-[#1c1f2b] my-6 flex flex-col items-center gap-4 shadow-xl max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#161824] flex items-center justify-center text-[#38bdf8]">
            <span className="material-symbols-outlined text-3xl">shopping_cart</span>
          </div>
          <h2 className="font-display font-bold text-xl text-white">Sepetiniz Boş</h2>
          <p className="text-xs text-[#94a3b8] max-w-sm">Kataloğumuzdaki dijital kodları ve oyun ürünlerini inceleyin.</p>
          <Link
            href="/katalog"
            className="px-6 py-3 rounded-xl bg-[#2563eb] text-white text-xs font-bold hover:bg-[#1d4ed8] transition-all shadow-md inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">sports_esports</span>
            E-Pin Kataloğuna Git
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] shadow-xl flex flex-col gap-4">
              <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#38bdf8]">shopping_bag</span>
                Sepetteki Ürünler ({lines.length})
              </h2>

              <div className="divide-y divide-[#1c1f2b]">
                {lines.map((item) => (
                  <div key={item.variantId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-[#161824] border border-[#222534] overflow-hidden flex items-center justify-center text-[#38bdf8] shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-2xl">sports_esports</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        {item.slug ? (
                          <Link href={`/urun/${item.slug}`} className="font-display font-bold text-sm text-white hover:text-[#38bdf8] line-clamp-1">
                            {item.title}
                          </Link>
                        ) : (
                          <div className="font-display font-bold text-sm text-white line-clamp-1">{item.title}</div>
                        )}
                        <div className="text-xs text-[#94a3b8]">
                          {item.denomination}
                          {item.storeName ? ` · ${item.storeName}` : ''}
                        </div>
                        {item.unavailableReason && (
                          <div className="text-[11px] font-bold text-rose-400 mt-0.5">{item.unavailableReason}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      <div className="flex items-center gap-1.5 bg-[#0d0e14] border border-[#1c1f2b] rounded-lg p-0.5">
                        <button
                          type="button"
                          aria-label="Azalt"
                          onClick={() => changeQuantity(item.variantId, item.quantity - 1)}
                          className="w-6 h-6 rounded bg-[#161824] hover:bg-[#202334] flex items-center justify-center text-xs font-bold text-white"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs font-bold px-2 text-white">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Arttır"
                          disabled={item.availableStock !== undefined && item.quantity >= item.availableStock}
                          onClick={() => changeQuantity(item.variantId, item.quantity + 1)}
                          className="w-6 h-6 rounded bg-[#161824] hover:bg-[#202334] flex items-center justify-center text-xs font-bold text-white disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-display font-bold text-sm text-white min-w-[80px] text-right">{formatTRY(item.unitPrice * item.quantity)}</span>
                      <button
                        type="button"
                        onClick={() => remove(item.variantId)}
                        className="text-[#64748b] hover:text-[#ef4444] transition-colors p-1"
                        title="Ürünü Çıkar"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] shadow-xl flex flex-col gap-4">
              <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#38bdf8]">payments</span>
                Ödeme Yöntemi
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-[#2563eb] bg-[#161a26] ring-2 ring-[#2563eb]/40 text-white flex flex-col justify-between">
                  <div className="flex items-center justify-between w-full">
                    <span className="material-symbols-outlined text-xl text-[#38bdf8]">account_balance_wallet</span>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Seçili</span>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs font-bold text-white">NexusPin Cüzdan</div>
                    <div className="text-[11px] text-[#94a3b8] mt-0.5">Bakiye: {formatTRY(user ? walletBalance : 0)}</div>
                  </div>
                </div>
                {[
                  { icon: 'credit_card', title: 'Kredi / Banka Kartı' },
                  { icon: 'account_balance', title: 'Havale / EFT' },
                ].map((m) => (
                  <div key={m.title} className="p-4 rounded-xl border border-[#1c1f2b] bg-[#0d0e14] text-[#64748b] flex flex-col justify-between opacity-60 cursor-not-allowed" aria-disabled>
                    <div className="flex items-center justify-between w-full">
                      <span className="material-symbols-outlined text-xl">{m.icon}</span>
                      <span className="text-[10px] font-bold uppercase">Yakında</span>
                    </div>
                    <div className="mt-3 text-xs font-bold">{m.title}</div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-xl text-xs font-bold text-rose-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base shrink-0">error</span>
                    <span>{error.message}</span>
                  </div>
                  {error.insufficient && (
                    <Link href="/hesabim/cuzdan" className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 transition-all shrink-0">
                      Cüzdanım
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 lg:sticky top-28 flex flex-col gap-4">
            <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] shadow-xl flex flex-col gap-4">
              <h2 className="font-display font-bold text-base text-white">Sipariş Özeti</h2>
              <div className="flex flex-col gap-2 text-xs text-[#94a3b8]">
                <div className="flex justify-between">
                  <span>Ara Toplam:</span>
                  <span className="font-bold text-white">{formatTRY(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>İşlem Bedeli:</span>
                  <span className="font-bold text-emerald-400">Ücretsiz</span>
                </div>
                <div className="pt-2 border-t border-[#1c1f2b] flex justify-between items-baseline">
                  <span className="text-sm font-bold text-white">Ödenecek Tutar:</span>
                  <span className="font-display font-black text-2xl text-[#38bdf8]">{formatTRY(total)}</span>
                </div>
              </div>

              {!user && (
                <div className="p-3 bg-[#161824] rounded-xl border border-[#2563eb]/30 text-xs text-[#38bdf8] font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">info</span>
                  Ödemeyi tamamlamak için giriş yapmanız gerekmektedir.
                </div>
              )}

              {user && (
                <ConsentCheckbox
                  documents={[
                    { href: legalHref('mesafeli-satis-sozlesmesi'), label: 'Mesafeli Satış Sözleşmesi ve Ön Bilgilendirme Formu' },
                    { href: legalHref('iade-politikasi'), label: 'İade Politikası' },
                  ]}
                  suffix="'nı okudum; dijital ürünlerde anında ifa nedeniyle cayma hakkımın bulunmadığını kabul ediyorum."
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                    setTermsError(undefined);
                  }}
                  error={termsError}
                />
              )}

              <button
                type="button"
                disabled={loading || hasUnavailable}
                onClick={handleCheckout}
                className="w-full py-4 px-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                <span>{loading ? 'İşleniyor...' : user ? 'Ödemeyi Tamamla' : 'Giriş Yap ve Ödemeyi Tamamla'}</span>
              </button>
              {hasUnavailable && <p className="text-[11px] text-rose-300">Satın alınamayan ürünleri sepetten çıkarınız.</p>}

              <div className="flex items-start gap-2 text-[11px] text-[#64748b] pt-2">
                <span className="material-symbols-outlined text-sm text-emerald-400">verified_user</span>
                <span>Ödemeniz, teslimatı onaylayana kadar güvenli havuzda tutulur; sorun olursa itiraz açabilirsiniz.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
