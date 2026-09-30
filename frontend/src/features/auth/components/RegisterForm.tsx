'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { LogoMark } from '@/components/ui/Logo';
import { FormAlert, FormField, inputClass } from '@/components/ui/FormField';
import { useRegister } from '../hooks/useAuthMutations';
import { registerSchema, RegisterValues } from '../schemas/auth.schema';
import { safeRedirect } from '../utils';
import GoogleAuthButton from './GoogleAuthButton';
import { ConsentCheckbox } from '@/components/ui/ConsentCheckbox';
import { legalHref } from '@/features/legal/constants';

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = safeRedirect(searchParams.get('redirect'));
  const registerUser = useRegister();
  const [googleError, setGoogleError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setGoogleError(null);
    try {
      await registerUser.mutateAsync(values);
    } catch {
      return; // Hata mesajı mutation durumundan gösterilir
    }
    router.push(redirectUrl);
    router.refresh();
  });

  const error = googleError ?? (registerUser.error ? getErrorMessage(registerUser.error, 'Kayıt işlemi gerçekleştirilemedi.') : null);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#10121a] border border-[#1c1f2b] rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <LogoMark className="w-10 h-10 mx-auto mb-4" />
          <h1 className="font-display font-black text-2xl text-white">Hesap Oluştur</h1>
          <p className="text-xs text-[#94a3b8] mt-1">NexusPin ailesine katılın, güvenli escrow ile alışverişin tadını çıkarın.</p>
        </div>

        <div className="mb-4">
          <FormAlert message={error} />
        </div>

        <GoogleAuthButton text="signup_with" redirectTo={redirectUrl} onError={setGoogleError} />
        <p className="text-[10px] text-[#64748b] text-center mt-2">
          Google ile devam ederek{' '}
          <Link href={legalHref('kullanim-kosullari')} target="_blank" className="text-[#38bdf8] hover:underline">
            Kullanım Koşulları
          </Link>
          {"'nı ve "}
          <Link href={legalHref('kvkk-aydinlatma-metni')} target="_blank" className="text-[#38bdf8] hover:underline">
            KVKK Aydınlatma Metni
          </Link>
          {"'ni kabul etmiş olursunuz."}
        </p>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-[#1c1f2b]" />
          <span className="text-[11px] font-mono text-[#64748b] uppercase">veya form ile</span>
          <div className="flex-1 h-px bg-[#1c1f2b]" />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label="Ad Soyad" error={formState.errors.name?.message}>
            <input type="text" autoComplete="name" placeholder="Adınız ve Soyadınız" className={inputClass} {...register('name')} />
          </FormField>
          <FormField label="E-Posta Adresi" error={formState.errors.email?.message}>
            <input type="email" autoComplete="email" placeholder="ornek@nexuspin.io" className={inputClass} {...register('email')} />
          </FormField>
          <FormField label="Şifre" error={formState.errors.password?.message}>
            <input type="password" autoComplete="new-password" placeholder="En az 8 karakter" className={inputClass} {...register('password')} />
          </FormField>
          <ConsentCheckbox
            documents={[
              { href: legalHref('kullanim-kosullari'), label: 'Kullanım Koşulları' },
              { href: legalHref('kvkk-aydinlatma-metni'), label: 'KVKK Aydınlatma Metni' },
            ]}
            suffix="'ni okudum, kabul ediyorum."
            error={formState.errors.acceptTerms?.message}
            {...register('acceptTerms')}
          />
          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="w-full mt-2 py-3.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs transition-all disabled:opacity-50"
          >
            {formState.isSubmitting ? 'Kayıt Yapılıyor...' : 'Kayıt Ol ve Başla'}
          </button>
        </form>

        <div className="text-center text-xs text-[#94a3b8] mt-6">
          Zaten hesabınız var mı?{' '}
          <Link href={`/auth/login${redirectUrl !== '/hesabim' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`} className="font-bold text-[#38bdf8] hover:underline">
            Giriş Yapın
          </Link>
        </div>
      </div>
    </div>
  );
}
