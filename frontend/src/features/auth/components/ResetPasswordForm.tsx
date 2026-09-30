'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { FormAlert, FormField, inputClass } from '@/components/ui/FormField';
import { useResetPassword } from '../hooks/useAuthMutations';
import { resetPasswordSchema, ResetPasswordValues } from '../schemas/auth.schema';
import { AuthCard } from './AuthCard';

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export default function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? '';
  const reset = useResetPassword();
  const { register, handleSubmit, formState } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit(async ({ password }) => {
    try {
      await reset.mutateAsync({ token, password });
    } catch {
      // Hata mutation durumundan gösterilir
    }
  });

  if (!TOKEN_PATTERN.test(token)) {
    return (
      <AuthCard icon="link_off" title="Geçersiz Bağlantı" subtitle="Şifre sıfırlama bağlantısı hatalı veya eksik.">
        <Link href="/auth/sifremi-unuttum" className="block text-center py-3 rounded-xl bg-[#2563eb] text-white text-xs font-bold">
          Yeni Bağlantı İste
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard icon="password" title="Yeni Şifre Belirle" subtitle="Şifreniz değiştiğinde tüm cihazlardaki oturumlarınız kapatılır.">
      {reset.isSuccess ? (
        <div className="flex flex-col gap-4">
          <FormAlert type="success" message="Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz." />
          <Link href="/auth/login" className="block text-center py-3 rounded-xl bg-[#2563eb] text-white text-xs font-bold">
            Giriş Yap
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormAlert message={reset.error ? getErrorMessage(reset.error) : null} />
          <FormField label="Yeni Şifre" error={formState.errors.password?.message}>
            <input type="password" autoComplete="new-password" placeholder="En az 8 karakter" className={inputClass} {...register('password')} />
          </FormField>
          <FormField label="Yeni Şifre (Tekrar)" error={formState.errors.passwordConfirm?.message}>
            <input type="password" autoComplete="new-password" className={inputClass} {...register('passwordConfirm')} />
          </FormField>
          <button
            type="submit"
            disabled={reset.isPending}
            className="w-full py-3.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs transition-all disabled:opacity-50"
          >
            {reset.isPending ? 'Kaydediliyor...' : 'Şifremi Güncelle'}
          </button>
          {reset.isError && (
            <Link href="/auth/sifremi-unuttum" className="text-center text-xs font-bold text-[#38bdf8] hover:underline">
              Yeni sıfırlama bağlantısı iste
            </Link>
          )}
        </form>
      )}
    </AuthCard>
  );
}
