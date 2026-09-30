'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/lib/api';
import { useGoogleLogin } from '../hooks/useAuthMutations';
import { isChallenge } from '../types';

interface GoogleAuthButtonProps {
  text?: 'signin_with' | 'signup_with';
  onSuccess?: () => void;
  onError?: (err: string) => void;
  /** 2FA açık hesapta ikinci adım için çağrılır */
  onChallenge?: (challengeToken: string) => void;
  redirectTo?: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleAuthButton({
  text = 'signin_with',
  onSuccess,
  onError,
  onChallenge,
  redirectTo = '/hesabim',
}: GoogleAuthButtonProps) {
  const router = useRouter();
  const { mutateAsync: loginWithGoogle } = useGoogleLogin();
  const loginWithGoogleRef = useRef(loginWithGoogle);
  loginWithGoogleRef.current = loginWithGoogle;
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const tokenClientRef = useRef<any>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Initialize Google OAuth2 token client
  useEffect(() => {
    const scriptId = 'google-gsi-client';

    const setupTokenClient = () => {
      setIsScriptLoaded(true);
      if (window.google?.accounts?.oauth2 && clientId) {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              setIsLoading(false);
              if (onError) onError('Google girişi iptal edildi veya bir hata oluştu.');
              return;
            }

            try {
              // Access token backend'de Google sunucularında doğrulanır
              const result = await loginWithGoogleRef.current(tokenResponse.access_token);
              if (isChallenge(result)) {
                if (onChallenge) onChallenge(result.challengeToken);
                else if (onError) onError('Hesabınızda iki adımlı doğrulama açık. Lütfen giriş sayfasından devam ediniz.');
                return;
              }
              if (onSuccess) onSuccess();
              router.push(redirectTo);
              router.refresh();
            } catch (err) {
              if (onError) onError(getErrorMessage(err, 'Google oturum açma hatası.'));
            } finally {
              setIsLoading(false);
            }
          },
        });
      }
    };

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = setupTokenClient;
      document.body.appendChild(script);
    } else {
      setupTokenClient();
    }
  }, [clientId, router, onError, onSuccess, redirectTo]);

  const handleGoogleClick = () => {
    if (!clientId) {
      if (onError) onError('Google Client ID yapılandırılmamış (.env).');
      return;
    }

    if (tokenClientRef.current) {
      setIsLoading(true);
      // Trigger official Google popup
      tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
    } else {
      if (onError) onError('Google bağlantı servisi hazırlanıyor, lütfen tekrar deneyin.');
    }
  };

  const buttonLabel = text === 'signup_with' ? 'Google ile Kayıt Ol' : 'Google ile Giriş Yap';

  return (
    <button
      type="button"
      onClick={handleGoogleClick}
      disabled={isLoading || !isScriptLoaded}
      className="group relative w-full h-[46px] px-4 rounded-xl bg-[#121520] hover:bg-[#181c2b] text-white border border-[#23283b] hover:border-[#38bdf8]/40 flex items-center justify-center gap-3 transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.4)] hover:shadow-[0_0_20px_rgba(56,189,248,0.12)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {isLoading ? (
        <div className="flex items-center gap-2.5 text-xs text-[#94a3b8] font-medium">
          <svg className="w-4 h-4 animate-spin text-[#38bdf8]" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Google ile bağlanılıyor...</span>
        </div>
      ) : (
        <>
          <div className="w-5 h-5 flex items-center justify-center shrink-0 p-0.5 rounded-full bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.09 3.66-5.18 3.66-9.12z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.43l4.03-3.14z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.57l4.03 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
              />
            </svg>
          </div>
          <span className="text-xs font-semibold tracking-wide text-slate-200 group-hover:text-white transition-colors">
            {buttonLabel}
          </span>
        </>
      )}
    </button>
  );
}
