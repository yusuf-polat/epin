'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/lib/api';
import { FormAlert } from '@/components/ui/FormField';
import { useVerifyEmail } from '../hooks/useAuthMutations';
import { authKeys } from '../constants';
import { AuthCard } from './AuthCard';

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export default function VerifyEmailView() {
  const token = useSearchParams().get('token') ?? '';
  const verify = useVerifyEmail();
  const queryClient = useQueryClient();
  const started = useRef(false);

  // Bağlantı açılınca bir kez doğrulanır (StrictMode'da çift çalışmayı önler)
  useEffect(() => {
    if (started.current || !TOKEN_PATTERN.test(token)) return;
    started.current = true;
    verify.mutate(token, { onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me }) });
  }, [token, verify, queryClient]);

  if (!TOKEN_PATTERN.test(token)) {
    return (
      <AuthCard icon="link_off" title="Geçersiz Bağlantı" subtitle="Doğrulama bağlantısı hatalı veya eksik.">
        <Link href="/hesabim" className="block text-center py-3 rounded-xl bg-[#2563eb] text-white text-xs font-bold">
          Hesabıma Git
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon={verify.isSuccess ? 'mark_email_read' : verify.isError ? 'error' : 'hourglass_top'}
      title={verify.isSuccess ? 'E-posta Doğrulandı' : verify.isError ? 'Doğrulanamadı' : 'Doğrulanıyor...'}
      subtitle={verify.isSuccess ? 'Hesabınız doğrulandı; tüm özellikleri kullanabilirsiniz.' : 'Lütfen bekleyiniz.'}
    >
      <div className="flex flex-col gap-4">
        {verify.isError && (
          <>
            <FormAlert message={getErrorMessage(verify.error)} />
            <p className="text-xs text-[#94a3b8] text-center">Hesabınıza giriş yapıp yeni bir doğrulama bağlantısı isteyebilirsiniz.</p>
          </>
        )}
        {!verify.isPending && (
          <Link href="/hesabim" className="block text-center py-3 rounded-xl bg-[#2563eb] text-white text-xs font-bold">
            Hesabıma Git
          </Link>
        )}
      </div>
    </AuthCard>
  );
}
