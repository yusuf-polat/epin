'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { FormAlert, FormField, inputClass } from '@/components/ui/FormField';
import { useForgotPassword } from '../hooks/useAuthMutations';
import { forgotPasswordSchema, ForgotPasswordValues } from '../schemas/auth.schema';
import { AuthCard } from './AuthCard';

export default function ForgotPasswordForm() {
  const forgot = useForgotPassword();
  const { register, handleSubmit, formState } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      await forgot.mutateAsync(email);
    } catch {
      // Hata mutation durumundan gösterilir
    }
  });

  return (
    <AuthCard icon="lock_reset" title="Şifremi Unuttum" subtitle="Hesabınıza kayıtlı e-posta adresini girin; şifre sıfırlama bağlantısı gönderelim.">
      {forgot.isSuccess ? (
        <FormAlert
          type="success"
          message="Bu e-posta adresine kayıtlı bir hesap varsa sıfırlama bağlantısı gönderildi. Gelen kutunuzu ve istenmeyen klasörünü kontrol ediniz."
        />
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormAlert message={forgot.error ? getErrorMessage(forgot.error) : null} />
          <FormField label="E-Posta Adresi" error={formState.errors.email?.message}>
            <input type="email" autoComplete="email" placeholder="ornek@nexuspin.io" className={inputClass} {...register('email')} />
          </FormField>
          <button
            type="submit"
            disabled={forgot.isPending}
            className="w-full py-3.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs transition-all disabled:opacity-50"
          >
            {forgot.isPending ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
          </button>
        </form>
      )}
      <div className="text-center text-xs text-[#94a3b8] mt-6">
        <Link href="/auth/login" className="font-bold text-[#38bdf8] hover:underline">
          Giriş sayfasına dön
        </Link>
      </div>
    </AuthCard>
  );
}
