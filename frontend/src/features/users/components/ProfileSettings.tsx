'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { FormAlert, FormField, inputClass } from '@/components/ui/FormField';
import { useAuth } from '@/features/auth/hooks/useAuth';
import TwoFactorSettings from '@/features/auth/components/TwoFactorSettings';
import { useUploadImage } from '@/features/uploads/hooks/useUploadImage';
import { IMAGE_ACCEPT } from '@/features/uploads/constants';
import { useChangePassword, useUpdateProfile } from '../hooks/useUsers';
import { passwordSchema, PasswordValues, profileSchema, ProfileValues } from '../schemas/user.schema';

function ProfileForm() {
  const { user } = useAuth();
  const update = useUpdateProfile();
  const upload = useUploadImage();
  const { register, handleSubmit, setValue, watch, formState } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', avatarUrl: user?.avatarUrl ?? '' },
  });
  const [name, avatarUrl] = watch(['name', 'avatarUrl']);

  const onAvatar = async (file?: File) => {
    if (!file) return;
    try {
      setValue('avatarUrl', await upload.mutateAsync(file), { shouldDirty: true });
    } catch {
      // Hata aşağıda gösterilir
    }
  };

  const submit = handleSubmit(async (v) => {
    try {
      await update.mutateAsync({ name: v.name, email: v.email, phone: v.phone || null, avatarUrl: v.avatarUrl || null });
    } catch {
      // Hata aşağıda gösterilir
    }
  });

  const error = update.error ?? upload.error;
  return (
    <form onSubmit={submit} className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-5" noValidate>
      <h2 className="font-display font-bold text-base text-white">Profil Bilgileri</h2>
      <div className="flex items-center gap-4">
        <UserAvatar name={name} avatarUrl={avatarUrl} size="lg" />
        <div className="flex flex-wrap gap-2">
          <label className="px-4 py-2 rounded-xl bg-[#161824] border border-[#222534] text-xs font-bold text-white cursor-pointer hover:border-[#38bdf8]">
            {upload.isPending ? 'Yükleniyor...' : 'Fotoğraf Yükle'}
            <input type="file" accept={IMAGE_ACCEPT} hidden onChange={(e) => onAvatar(e.target.files?.[0])} />
          </label>
          {avatarUrl && (
            <button type="button" onClick={() => setValue('avatarUrl', '', { shouldDirty: true })} className="px-4 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10">
              Kaldır
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Ad Soyad" error={formState.errors.name?.message}>
          <input className={inputClass} maxLength={80} {...register('name')} />
        </FormField>
        <FormField label="E-Posta" error={formState.errors.email?.message}>
          <input type="email" className={inputClass} {...register('email')} />
        </FormField>
        <FormField label="Telefon" error={formState.errors.phone?.message}>
          <input type="tel" maxLength={20} className={inputClass} placeholder="+90 5xx xxx xx xx" {...register('phone')} />
        </FormField>
      </div>
      <FormAlert message={error ? getErrorMessage(error) : null} />
      {update.isSuccess && !formState.isDirty && <FormAlert type="success" message="Profil bilgileriniz güncellendi." />}
      <div className="flex justify-end">
        <button type="submit" disabled={formState.isSubmitting || upload.isPending} className="px-6 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold disabled:opacity-50">
          {formState.isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const change = useChangePassword();
  const { register, handleSubmit, reset, formState } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const submit = handleSubmit(async (v) => {
    try {
      await change.mutateAsync({ oldPassword: v.oldPassword, newPassword: v.newPassword });
      reset();
    } catch {
      // Hata aşağıda gösterilir
    }
  });

  return (
    <form onSubmit={submit} className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-5" noValidate>
      <h2 className="font-display font-bold text-base text-white">Şifre Değiştir</h2>
      <p className="text-[11px] text-[#64748b] -mt-3">Google ile kayıt olduysanız şifre belirlemek için destek ekibiyle iletişime geçebilirsiniz.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField label="Mevcut Şifre" error={formState.errors.oldPassword?.message}>
          <input type="password" autoComplete="current-password" className={inputClass} {...register('oldPassword')} />
        </FormField>
        <FormField label="Yeni Şifre" error={formState.errors.newPassword?.message}>
          <input type="password" autoComplete="new-password" className={inputClass} {...register('newPassword')} />
        </FormField>
        <FormField label="Yeni Şifre (Tekrar)" error={formState.errors.confirm?.message}>
          <input type="password" autoComplete="new-password" className={inputClass} {...register('confirm')} />
        </FormField>
      </div>
      <FormAlert message={change.error ? getErrorMessage(change.error) : null} />
      {change.isSuccess && <FormAlert type="success" message="Şifreniz değiştirildi." />}
      <div className="flex justify-end">
        <button type="submit" disabled={formState.isSubmitting} className="px-6 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold disabled:opacity-50">
          {formState.isSubmitting ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
        </button>
      </div>
    </form>
  );
}

export default function ProfileSettings() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b]">
        <h1 className="font-display font-extrabold text-xl text-white">Hesap Ayarları</h1>
        <p className="text-xs text-[#94a3b8] mt-1">Profil bilgilerinizi, şifrenizi ve hesap güvenliğinizi yönetin.</p>
      </div>
      <ProfileForm />
      <PasswordForm />
      <TwoFactorSettings />
    </div>
  );
}
