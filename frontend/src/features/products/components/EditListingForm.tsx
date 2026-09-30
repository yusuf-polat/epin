'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { formatTRY } from '@/lib/utils/format';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Toast, useToast } from '@/components/shared/Toast';
import { FormAlert, FormField, inputClass } from '@/components/ui/FormField';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { useUploadImage } from '@/features/uploads/hooks/useUploadImage';
import { useListingForEdit, useUpdateListing } from '../hooks/useProducts';
import { EDIT_LISTING_STEP_FIELDS, EditListingInput, editListingSchema, EditListingValues } from '../schemas/product.schema';
import { deliveryLabel, LISTING_STATUS } from '../constants';
import { EditableListing } from '../types';
import { listingChanges } from '../utils';
import { ListingGalleryField } from './ListingGalleryField';
import { ListingStepper } from './ListingStepper';
import { ListingVisibilityButton } from './ListingVisibilityButton';
import { RegionField } from './RegionField';
import { DEFAULT_REGION, REGION_CODES, RegionCode, regionLabel } from '../regions';

type Step = 1 | 2 | 3 | 4;
const STEPS: { step: Step; label: string }[] = [
  { step: 1, label: 'Ürün Bilgisi' },
  { step: 2, label: 'Fiyat & Görseller' },
  { step: 3, label: 'Teslimat' },
  { step: 4, label: 'Önizleme & Kaydet' },
];

function Wizard({ listing }: { listing: EditableListing }) {
  const router = useRouter();
  const categories = useCategories();
  const upload = useUploadImage();
  const update = useUpdateListing();
  const { toast, show } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const isManual = listing.deliveryType === 'MANUAL';

  const { register, handleSubmit, trigger, watch, setValue, formState } = useForm<EditListingInput>({
    resolver: zodResolver(editListingSchema),
    defaultValues: {
      title: listing.title,
      categoryId: listing.categoryId,
      brand: listing.brand,
      region: (REGION_CODES as readonly string[]).includes(listing.region) ? (listing.region as RegionCode) : DEFAULT_REGION,
      description: listing.description,
      price: listing.price,
      originalPrice: listing.originalPrice ?? '',
      // Galeri boşsa mevcut kapak görseli korunur
      images: listing.galleryUrls,
      deadlineHours: listing.deliveryDeadlineHours,
      instructions: listing.deliveryInstructions ?? '',
    },
  });
  const errors = formState.errors;
  const values = watch();
  const categoryName = (id: string) => categories.data?.find((c) => c.id === id)?.name ?? '—';

  // Önizleme adımında değerler zaten doğrulanmıştır
  const parsed = step === 4 ? editListingSchema.safeParse(values) : null;
  const changes = parsed?.success ? listingChanges(listing, parsed.data, categoryName) : [];
  const requiresApproval = listing.approvalStatus !== 'PENDING' && changes.some((c) => c.reapproval);

  const next = async () => {
    if (step === 4) return;
    setError(null);
    const ok = await trigger([...EDIT_LISTING_STEP_FIELDS[step as 1 | 2 | 3]]);
    if (ok) setStep((step + 1) as Step);
  };

  const save = handleSubmit(
    async (raw) => {
      const v: EditListingValues = editListingSchema.parse(raw);
      setError(null);
      try {
        await update.mutateAsync({
          id: listing.id,
          input: {
            title: v.title,
            description: v.description,
            categoryId: v.categoryId,
            brand: v.brand,
            region: v.region,
            price: v.price,
            originalPrice: v.originalPrice ?? null,
            galleryUrls: v.images,
            deliveryDeadlineHours: isManual ? v.deadlineHours : undefined,
            deliveryInstructions: v.instructions || null,
          },
        });
        router.push('/hesabim/pazar');
      } catch (err) {
        setError(getErrorMessage(err, 'İlan güncellenemedi'));
      }
    },
    // Hatalı alanın bulunduğu adıma geri dön
    (errs) => {
      const failedStep = ([1, 2, 3] as const).find((s) => EDIT_LISTING_STEP_FIELDS[s].some((f) => f in errs));
      if (failedStep) setStep(failedStep);
    }
  );

  const status = listing.isListed ? LISTING_STATUS[listing.approvalStatus] : LISTING_STATUS.UNLISTED;
  const cover = values.images[0] || listing.imageUrl;

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-2xl text-white">İlanı Düzenle</h1>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border shrink-0 ${status.className}`}>{status.label}</span>
            </div>
            <p className="text-xs text-[#94a3b8] mt-1 truncate">{listing.title}</p>
          </div>
          <ListingVisibilityButton id={listing.id} isListed={listing.isListed} onResult={show} />
        </div>
        {!listing.isListed && (
          <p className="mt-3 text-[11px] text-amber-300/90">
            Bu ilan şu an vitrinde görünmüyor ve satın alınamıyor. Düzenlemeyi kaydetmek ilanı yayına almaz; hazır olduğunuzda &quot;Yayına Al&quot;a basın.
          </p>
        )}
        <ListingStepper steps={STEPS} current={step} />
      </div>

      <form
        // Ara adımlarda Enter tuşu kaydetmez, sonraki adıma geçer
        onSubmit={(e) => {
          if (step < 4) {
            e.preventDefault();
            void next();
          } else void save(e);
        }}
        className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-5"
      >
        {step === 1 && (
          <>
            <FormField label="İlan Başlığı" error={errors.title?.message}>
              <input className={inputClass} maxLength={150} {...register('title')} />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Kategori" error={errors.categoryId?.message}>
                <select className={inputClass} {...register('categoryId')}>
                  {categories.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Marka" error={errors.brand?.message}>
                <input className={inputClass} maxLength={80} {...register('brand')} />
              </FormField>
              <RegionField registration={register('region')} value={values.region} error={errors.region?.message} />
            </div>
            <FormField label="Açıklama" error={errors.description?.message}>
              <textarea className={inputClass} rows={6} maxLength={10000} {...register('description')} />
            </FormField>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Satış Fiyatı (₺)" error={errors.price?.message} hint="Fiyat değişikliği onay beklemeden yayına yansır.">
                <input className={inputClass} type="number" min={0} step="0.01" {...register('price')} />
              </FormField>
              <FormField label="Liste Fiyatı (₺, isteğe bağlı)" error={errors.originalPrice?.message}>
                <input className={inputClass} type="number" min={0} step="0.01" {...register('originalPrice')} />
              </FormField>
            </div>
            <ListingGalleryField
              images={values.images}
              onChange={(images) => setValue('images', images, { shouldDirty: true })}
              onError={setError}
              upload={upload}
              hint="Tüm görselleri silerseniz mevcut kapak görseli korunur. JPEG/PNG/WebP, en fazla 5MB."
            />
          </>
        )}

        {step === 3 && (
          <>
            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1c1f2b] flex items-start gap-3">
              <span className="material-symbols-outlined text-[#38bdf8]">{isManual ? 'schedule' : 'download_done'}</span>
              <div className="text-xs text-[#94a3b8]">
                <div className="font-bold text-sm text-white">{isManual ? 'Manuel Teslimat' : 'Anında Teslimat'}</div>
                Teslimat tipi sonradan değiştirilemez. {isManual ? 'Stok adedini' : 'Yeni kodları'} ilan listesindeki &quot;Stok&quot; butonundan güncelleyebilirsiniz.
              </div>
            </div>
            {isManual && (
              <FormField label="Teslim Süresi (saat)" error={errors.deadlineHours?.message} hint="Süre dolarsa ödeme alıcıya iade edilir.">
                <input className={inputClass} type="number" min={1} max={168} {...register('deadlineHours')} />
              </FormField>
            )}
            <FormField label="Teslimat Bilgisi (isteğe bağlı, ürün sayfasında görünür)" error={errors.instructions?.message}>
              <textarea className={inputClass} rows={4} maxLength={2000} {...register('instructions')} />
            </FormField>
          </>
        )}

        {step === 4 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <img src={cover} alt="" className="w-full aspect-[16/11] object-cover rounded-xl border border-[#23293a]" />
              <div className="sm:col-span-2 flex flex-col gap-2 text-xs text-[#94a3b8]">
                <h3 className="font-display font-black text-lg text-white">{values.title}</h3>
                <span>
                  {categoryName(values.categoryId)} · {values.brand || listing.brand} · {regionLabel(values.region)}
                </span>
                <span className="font-display font-black text-2xl text-[#38bdf8]">{formatTRY(Number(values.price))}</span>
                <span>{deliveryLabel(listing.deliveryType, isManual ? Number(values.deadlineHours) : undefined)}</span>
                <p className="whitespace-pre-line line-clamp-6">{values.description}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#1c1f2b] overflow-hidden">
              <div className="px-4 py-2.5 bg-[#090a0f] text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">Değişiklikler</div>
              {changes.length === 0 ? (
                <p className="px-4 py-3 text-xs text-[#64748b]">Henüz bir değişiklik yapmadınız.</p>
              ) : (
                <ul className="divide-y divide-[#1c1f2b]">
                  {changes.map((c) => (
                    <li key={c.label} className="px-4 py-2.5 grid grid-cols-[110px_1fr] gap-3 text-xs">
                      <span className="font-bold text-white">{c.label}</span>
                      <span className="min-w-0 text-[#94a3b8]">
                        <span className="line-through text-[#64748b] break-words line-clamp-2">{c.before}</span>
                        <span className="text-emerald-300 break-words line-clamp-2">{c.after}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {requiresApproval ? (
              <p className="text-[11px] text-amber-300">
                İçerik değişikliği yaptığınız için ilan kaydedildikten sonra yeniden onaya düşer ve onaylanana kadar vitrinde görünmez.
              </p>
            ) : (
              changes.length > 0 && <p className="text-[11px] text-emerald-300">Bu değişiklikler onay beklemeden yayına yansır.</p>
            )}
          </>
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
            <button
              type="submit"
              disabled={update.isPending || changes.length === 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
            >
              {update.isPending ? 'Kaydediliyor...' : requiresApproval ? 'Kaydet ve Onaya Gönder' : 'Değişiklikleri Kaydet'}
            </button>
          )}
        </div>
      </form>
      <Toast toast={toast} />
    </div>
  );
}

export default function EditListingForm({ id }: { id: string }) {
  const listing = useListingForEdit(id);
  if (listing.isPending) return <LoadingState />;
  if (listing.isError) return <ErrorState message={getErrorMessage(listing.error, 'İlan bulunamadı')} onRetry={() => listing.refetch()} />;
  if (!listing.data.isActive) return <ErrorState message="Satışa kapatılmış ilanlar düzenlenemez." />;
  return <Wizard listing={listing.data} />;
}
