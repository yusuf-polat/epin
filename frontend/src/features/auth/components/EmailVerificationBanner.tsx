'use client';

import { getErrorMessage } from '@/lib/api';
import { useAuth } from '../hooks/useAuth';
import { useResendVerification } from '../hooks/useAuthMutations';

/** E-postası doğrulanmamış kullanıcıya hesap sayfalarında gösterilir */
export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const resend = useResendVerification();
  if (!user || user.emailVerified !== false) return null;

  return (
    <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-300">mark_email_unread</span>
        <div className="text-xs text-amber-100">
          <strong className="block text-amber-200">E-posta adresinizi doğrulayın</strong>
          {resend.isSuccess
            ? `Doğrulama bağlantısı ${user.email} adresine gönderildi. Gelen kutunuzu (ve istenmeyen klasörünü) kontrol edin.`
            : resend.isError
              ? getErrorMessage(resend.error)
              : `${user.email} adresine gönderdiğimiz bağlantıyla hesabınızı doğrulayın. Para çekme işlemleri için doğrulama gerekir.`}
        </div>
      </div>
      {!resend.isSuccess && (
        <button
          type="button"
          onClick={() => resend.mutate()}
          disabled={resend.isPending}
          className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100 text-xs font-bold shrink-0 disabled:opacity-50"
        >
          {resend.isPending ? 'Gönderiliyor...' : 'Bağlantıyı Tekrar Gönder'}
        </button>
      )}
    </div>
  );
}
