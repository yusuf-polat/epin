'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { FormAlert, FormField, inputClass } from '@/components/ui/FormField';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ImageUploadField } from '@/features/uploads/components/ImageUploadField';
import { useCreateStore, useMyStore, useUpdateStore } from '../hooks/useStores';
import { storeSchema, StoreValues, toStoreSlug } from '../schemas/store.schema';

export default function StoreForm() {
  const router = useRouter();
  const { user } = useAuth();
  const myStore = useMyStore();
  const create = useCreateStore();
  const update = useUpdateStore();
  const store = myStore.data ?? null;
  const { register, handleSubmit, control, reset, setValue, formState } = useForm<StoreValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: { name: '', slug: '', description: '', logoUrl: '', coverUrl: '' },
  });

  useEffect(() => {
    if (store) reset({ name: store.name, slug: store.slug, description: store.description ?? '', logoUrl: store.logoUrl, coverUrl: store.coverUrl });
  }, [store, reset]);

  if (myStore.isPending) return <LoadingState />;
  if (user && !user.canSell && user.role !== 'ADMIN') {
    return (
      <EmptyState
        icon="verified_user"
        title="Satıcı Yetkisi Gerekli"
        description="Mağaza açabilmek için önce satıcı başvurunuzun onaylanması gerekir."
        action={{ label: 'Satıcı Başvurusu Yap', href: '/hesabim/satici-basvuru' }}
      />
    );
  }

  const submit = handleSubmit(async (values) => {
    try {
      if (store) {
        await update.mutateAsync({ description: values.description, logoUrl: values.logoUrl, coverUrl: values.coverUrl });
      } else {
        const created = await create.mutateAsync(values);
        router.push(`/magaza/${created.slug}`);
      }
    } catch {
      // Hata aşağıda gösterilir
    }
  });

  const mutationError = create.error ?? update.error;
  const errors = formState.errors;

  return (
    <form onSubmit={submit} className="w-full flex flex-col gap-6" noValidate>
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-xl text-white">{store ? 'Mağazamı Düzenle' : 'Mağaza Oluştur'}</h1>
          <p className="text-xs text-[#94a3b8] mt-1">Mağaza adı ve adresi oluşturulduktan sonra değiştirilemez.</p>
        </div>
        {store && (
          <Link href={`/magaza/${store.slug}`} className="px-4 py-2 rounded-xl bg-[#161824] border border-[#222534] text-[#38bdf8] text-xs font-bold">
            Mağazayı Görüntüle
          </Link>
        )}
      </div>

      {store && !store.isActive && (
        <FormAlert message="Mağazanız yönetim tarafından askıya alınmıştır; ilanlarınız listelenmez. Detay için destek ekibiyle iletişime geçiniz." />
      )}

      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Mağaza Adı" error={errors.name?.message}>
            <input
              className={inputClass}
              maxLength={50}
              disabled={!!store}
              {...register('name', { onChange: (e) => !store && setValue('slug', toStoreSlug(e.target.value), { shouldValidate: formState.isSubmitted }) })}
            />
          </FormField>
          <FormField label="Mağaza Adresi (/magaza/...)" error={errors.slug?.message}>
            <input
              className={inputClass}
              maxLength={50}
              disabled={!!store}
              {...register('slug', { setValueAs: (v: string) => toStoreSlug(v) })}
            />
          </FormField>
        </div>
        <FormField label="Açıklama" error={errors.description?.message}>
          <textarea rows={4} maxLength={500} className={inputClass} {...register('description')} />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4">
          <Controller
            control={control}
            name="logoUrl"
            render={({ field, fieldState }) => (
              <ImageUploadField label="Logo (kare)" shape="square" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="coverUrl"
            render={({ field, fieldState }) => <ImageUploadField label="Kapak Görseli (yatay)" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />}
          />
        </div>

        <FormAlert message={mutationError ? getErrorMessage(mutationError) : null} />
        {update.isSuccess && <FormAlert type="success" message="Mağaza bilgileri güncellendi." />}

        <div className="flex justify-end">
          <button type="submit" disabled={formState.isSubmitting} className="px-6 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold disabled:opacity-50">
            {formState.isSubmitting ? 'Kaydediliyor...' : store ? 'Değişiklikleri Kaydet' : 'Mağazayı Oluştur'}
          </button>
        </div>
      </div>
    </form>
  );
}
