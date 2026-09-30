'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { formatTRY } from '@/lib/utils/format';
import { splitLines } from '@/lib/validations/common';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { FormAlert, FormField, inputClass } from '@/components/ui/FormField';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { useUploadImage } from '@/features/uploads/hooks/useUploadImage';
import { useCreateListing } from '../hooks/useProducts';
import { LISTING_DEFAULTS, LISTING_STEP_FIELDS, ListingFormInput, listingSchema, ListingValues } from '../schemas/product.schema';
import { ListingGalleryField } from './ListingGalleryField';
import { ListingStepper } from './ListingStepper';
import { RegionField } from './RegionField';
import { regionLabel } from '../regions';

type Step = 1 | 2 | 3 | 4;
const STEPS: { step: Step; label: string }[] = [
  { step: 1, label: 'Ürün Bilgisi' },
  { step: 2, label: 'Fiyat & Görseller' },
  { step: 3, label: 'Teslimat & Stok' },
  { step: 4, label: 'Önizleme' },
];

const DELIVERY_OPTIONS = [
  ['INSTANT', 'download_done', 'Anında Teslimat', 'Kodları şimdi yükleyin; satın alma anında alıcıya otomatik verilir.'],
  ['MANUAL', 'schedule', 'Manuel Teslimat', 'Siparişi siz teslim edersiniz (hesap, özel kod vb.). Süre dolarsa ödeme iade edilir.'],
] as const;

export default function NewListingWizard() {
  const { user } = useAuth();
  const categories = useCategories();
  const upload = useUploadImage();
  const createListing = useCreateListing();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  const { register, handleSubmit, trigger, watch, setValue, getValues, formState } = useForm<ListingFormInput>({
    resolver: zodResolver(listingSchema),
    defaultValues: LISTING_DEFAULTS,
  });
  const errors = formState.errors;
  const values = watch();
  const codes = splitLines(values.codesText);
  const category = categories.data?.find((c) => c.id === values.categoryId);

  // Kategoriler gelince ilkini varsayılan seç
  useEffect(() => {
    const first = categories.data?.[0];
    if (first && !getValues('categoryId')) setValue('categoryId', first.id);
  }, [categories.data, getValues, setValue]);

  if (categories.isPending) return <LoadingState />;
  if (categories.isError) return <ErrorState message={getErrorMessage(categories.error, 'Kategoriler yüklenemedi')} onRetry={() => categories.refetch()} />;
  if (user && !user.canSell && user.role !== 'ADMIN') {
    return <EmptyState icon="lock" title="Satıcı Yetkisi Gerekli" action={{ label: 'Satıcı Başvurusu Yap', href: '/hesabim/satici-basvuru' }} />;
  }
  if (user && !user.store) {
    return (
      <EmptyState
        icon="store"
        title="Önce Mağazanızı Oluşturun"
        description="İlan yayınlayabilmek için aktif bir mağazanız olmalıdır."
        action={{ label: 'Mağaza Oluştur', href: '/hesabim/magazam/olustur' }}
      />
    );
  }

  const next = async () => {
    if (step === 4) return;
    setError(null);
    const ok = await trigger([...LISTING_STEP_FIELDS[step as 1 | 2 | 3]]);
    if (ok) setStep((step + 1) as Step);
  };

  const publish = handleSubmit(
    async (raw) => {
      // Resolver doğruladı; parse dönüştürülmüş (sayısal) değerleri tipli olarak verir
      const v: ListingValues = listingSchema.parse(raw);
      setError(null);
      try {
        const product = await createListing.mutateAsync({
          title: v.title,
          description: v.description,
          categoryId: v.categoryId,
          brand: v.brand || undefined,
          region: v.region,
          price: v.price,
          originalPrice: v.originalPrice,
          imageUrl: v.images[0],
          galleryUrls: v.images,
          deliveryType: v.deliveryType,
          deliveryDeadlineHours: v.deliveryType === 'MANUAL' ? v.deadlineHours : undefined,
          deliveryInstructions: v.instructions || undefined,
          stockCount: v.deliveryType === 'MANUAL' ? v.stockCount : undefined,
          codes: v.deliveryType === 'INSTANT' ? splitLines(v.codesText) : undefined,
        });
        setPublishedSlug(product.slug);
      } catch (err) {
        setError(getErrorMessage(err, 'İlan oluşturulamadı'));
      }
    },
    // Hatalı alanın bulunduğu adıma geri dön
    (errs) => {
      const failedStep = ([1, 2, 3] as const).find((s) => LISTING_STEP_FIELDS[s].some((f) => f in errs));
      if (failedStep) setStep(failedStep);
    }
  );

  if (publishedSlug) {
    return (
      <div className="bg-[#10121a] rounded-3xl p-10 border border-emerald-500/40 flex flex-col items-center gap-4 text-center">
        <span className="material-symbols-outlined text-5xl text-emerald-400">check_circle</span>
        <h2 className="font-display font-black text-xl text-white">İlanınız Onaya Gönderildi</h2>
        <p className="text-xs text-[#94a3b8] max-w-md">Destek ekibimiz ilanı inceledikten sonra yayına alınacak; sonucu bildirim olarak alacaksınız.</p>
        <div className="flex gap-3">
          <Link href={`/urun/${publishedSlug}`} className="px-5 py-2.5 rounded-xl bg-[#161824] border border-[#222534] text-white text-xs font-bold">
            Önizle
          </Link>
          <Link href="/hesabim/pazar" className="px-5 py-2.5 rounded-xl bg-[#2563eb] text-white text-xs font-bold">
            İlanlarıma Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b]">
        <h1 className="font-display font-black text-2xl text-white">Yeni Pazar İlanı</h1>
        <p className="text-xs text-[#94a3b8] mt-1">İlanınız onaylandıktan sonra yayına girer.</p>
        <ListingStepper steps={STEPS} current={step} />
      </div>

      <form
        // Ara adımlarda Enter tuşu yayınlamaz, sonraki adıma geçer
        onSubmit={(e) => {
          if (step < 4) {
            e.preventDefault();
            void next();
          } else void publish(e);
        }}
        className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-5">
        {step === 1 && (
          <>
            <FormField label="İlan Başlığı" error={errors.title?.message}>
              <input className={inputClass} maxLength={150} placeholder="Örn: Valorant 1000 VP (TR)" {...register('title')} />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Kategori" error={errors.categoryId?.message}>
                <select className={inputClass} {...register('categoryId')}>
                  {categories.data.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Marka" error={errors.brand?.message}>
                <input className={inputClass} maxLength={80} placeholder={category?.name ?? 'Örn: Riot Games'} {...register('brand')} />
              </FormField>
              <RegionField registration={register('region')} value={values.region} error={errors.region?.message} />
            </div>
            <FormField label="Açıklama" error={errors.description?.message}>
              <textarea className={inputClass} rows={6} maxLength={10000} placeholder="Ürün, kullanım koşulları ve bölge kısıtları" {...register('description')} />
            </FormField>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Satış Fiyatı (₺)" error={errors.price?.message}>
                <input className={inputClass} type="number" min={0} step="0.01" {...register('price')} />
              </FormField>
              <FormField label="Liste Fiyatı (₺, isteğe bağlı)" error={errors.originalPrice?.message}>
                <input className={inputClass} type="number" min={0} step="0.01" {...register('originalPrice')} />
              </FormField>
            </div>
            <ListingGalleryField
              images={values.images}
              onChange={(images) => setValue('images', images)}
              onError={setError}
              upload={upload}
              hint="Görsel eklemezseniz kategori görseli kullanılır. JPEG/PNG/WebP, en fazla 5MB."
            />
          </>
        )}

        {step === 3 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DELIVERY_OPTIONS.map(([value, icon, title, desc]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('deliveryType', value)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    values.deliveryType === value ? 'bg-[#2563eb]/10 border-[#2563eb]' : 'bg-[#090a0f] border-[#1c1f2b] hover:border-[#2563eb]/50'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-white">
                    <span className="material-symbols-outlined text-[#38bdf8]">{icon}</span>
                    {title}
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-1">{desc}</p>
                </button>
              ))}
            </div>

            {values.deliveryType === 'INSTANT' ? (
              <FormField
                label={`Dijital Kodlar (her satıra bir kod) · ${codes.length} kod`}
                error={errors.codesText?.message}
                hint="Tekrar eden satırlar otomatik ayıklanır. Kodlar yalnızca satın alan kişiye gösterilir."
              >
                <textarea className={`${inputClass} font-mono text-emerald-300`} rows={8} placeholder={'KOD-1111-2222\nKOD-3333-4444'} {...register('codesText')} />
              </FormField>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Stok Adedi" error={errors.stockCount?.message}>
                  <input className={inputClass} type="number" min={1} max={10000} {...register('stockCount')} />
                </FormField>
                <FormField label="Teslim Süresi (saat)" error={errors.deadlineHours?.message}>
                  <input className={inputClass} type="number" min={1} max={168} {...register('deadlineHours')} />
                </FormField>
              </div>
            )}
            <FormField label="Teslimat Bilgisi (isteğe bağlı, ürün sayfasında görünür)" error={errors.instructions?.message}>
              <textarea className={inputClass} rows={3} maxLength={2000} {...register('instructions')} />
            </FormField>
          </>
        )}

        {step === 4 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <img src={values.images[0] || category?.imageUrl} alt="" className="w-full aspect-[16/11] object-cover rounded-xl border border-[#23293a]" />
            <div className="sm:col-span-2 flex flex-col gap-2 text-xs text-[#94a3b8]">
              <h3 className="font-display font-black text-lg text-white">{values.title}</h3>
              <span>
                {category?.name} · {values.brand || category?.name} · {regionLabel(values.region)}
              </span>
              <span className="font-display font-black text-2xl text-[#38bdf8]">{formatTRY(Number(values.price))}</span>
              <span>
                {values.deliveryType === 'INSTANT'
                  ? `Anında teslimat · ${codes.length} kod`
                  : `Manuel teslimat · ${values.deadlineHours} saat · ${values.stockCount} stok`}
              </span>
              <p className="whitespace-pre-line line-clamp-6">{values.description}</p>
            </div>
          </div>
        )}

        <FormAlert message={error} />

        <div className="flex items-center justify-between pt-4 border-t border-[#1c1f2b]">
          {step > 1 ? (
            <button type="button" onClick={() => setStep((step - 1) as Step)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#94a3b8] hover:text-white">
              ← Geri
            </button>
          ) : (
            <Link href="/hesabim/pazar" className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#94a3b8] hover:text-white">
              Vazgeç
            </Link>
          )}
          {step < 4 ? (
            <button type="button" onClick={next} disabled={upload.isPending} className="px-6 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold disabled:opacity-50">
              Devam →
            </button>
          ) : (
            <button type="submit" disabled={createListing.isPending} className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50">
              {createListing.isPending ? 'Gönderiliyor...' : 'Onaya Gönder'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
