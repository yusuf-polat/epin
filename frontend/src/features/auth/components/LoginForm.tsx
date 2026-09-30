'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { LogoMark } from '@/components/ui/Logo';
import { FormAlert, FormField, inputClass } from '@/components/ui/FormField';
import { useLogin } from '../hooks/useAuthMutations';
import { loginSchema, LoginValues } from '../schemas/auth.schema';
import { safeRedirect } from '../utils';
import { isChallenge } from '../types';
import GoogleAuthButton from './GoogleAuthButton';
import TwoFactorLoginStep from './TwoFactorLoginStep';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = safeRedirect(searchParams.get('redirect'));
  const login = useLogin();
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setGoogleError(null);
    try {
      const result = await login.mutateAsync(values);
      if (isChallenge(result)) return setChallengeToken(result.challengeToken);
    } catch {
      return; // Hata mesajı mutation durumundan gösterilir
    }
    finish();
  });

  function finish() {
    router.push(redirectUrl);
    router.refresh();
  }

  const error = googleError ?? (login.error ? getErrorMessage(login.error, 'Giriş yapılamadı.') : null);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#10121a] border border-[#1c1f2b] rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <LogoMark className="w-10 h-10 mx-auto mb-4" />
          <h1 className="font-display font-black text-2xl text-white">Giriş Yap</h1>
          <p className="text-xs text-[#94a3b8] mt-1">
            {redirectUrl.includes('sepet') ? 'Siparişinizi tamamlamak için lütfen hesabınıza giriş yapın.' : 'NexusPin hesabınıza erişin ve dijital kodlarınızı yönetin.'}
          </p>
        </div>

        {challengeToken ? (
          <TwoFactorLoginStep
            challengeToken={challengeToken}
            onSuccess={finish}
            onCancel={() => {
              setChallengeToken(null);
              login.reset();
            }}
          />
        ) : (
          <>
        <div className="mb-4">
          <FormAlert message={error} />
        </div>

        <GoogleAuthButton text="signin_with" redirectTo={redirectUrl} onError={setGoogleError} onChallenge={setChallengeToken} />

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-[#1c1f2b]" />
          <span className="text-[11px] font-mono text-[#64748b] uppercase">veya e-posta ile</span>
          <div className="flex-1 h-px bg-[#1c1f2b]" />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label="E-Posta Adresi" error={formState.errors.email?.message}>
            <input type="email" autoComplete="email" placeholder="ornek@nexuspin.io" className={inputClass} {...register('email')} />
          </FormField>
          <FormField label="Şifre" error={formState.errors.password?.message}>
            <input type="password" autoComplete="current-password" placeholder="••••••••" className={inputClass} {...register('password')} />
          </FormField>
          <Link href="/auth/sifremi-unuttum" className="self-end -mt-2 text-[11px] font-bold text-[#38bdf8] hover:underline">
            Şifremi unuttum
          </Link>
          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="w-full mt-2 py-3.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs transition-all disabled:opacity-50"
          >
            {formState.isSubmitting ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
          </>
        )}

        <div className="text-center text-xs text-[#94a3b8] mt-6">
          Hesabınız yok mu?{' '}
          <Link href={`/auth/register${redirectUrl !== '/hesabim' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`} className="font-bold text-[#38bdf8] hover:underline">
            Kayıt Olun
          </Link>
        </div>
      </div>
    </div>
  );
}
