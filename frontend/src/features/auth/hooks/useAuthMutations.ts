'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '../constants';
import { authApi, twoFactorApi } from '../services/auth.api';
import { isChallenge, LoginInput, LoginResult, RegisterInput } from '../types';

/**
 * Giriş/kayıt sonrası oturum önbelleğe yazılır; kullanıcıya ait diğer veriler temizlenir.
 * 2FA açık hesapta yanıt oturum değil ikinci adım (challenge) içerir; önbellek değişmez.
 */
function useSessionMutation<TInput, TResult extends LoginResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      if (isChallenge(result)) return;
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });
      queryClient.setQueryData(authKeys.me, result.user);
    },
  });
}

export const useLogin = () => useSessionMutation((input: LoginInput) => authApi.login(input));
export const useRegister = () => useSessionMutation((input: RegisterInput) => authApi.register(input));
export const useGoogleLogin = () => useSessionMutation((accessToken: string) => authApi.google(accessToken));
export const useTwoFactorLogin = () => useSessionMutation((v: { challengeToken: string; code: string }) => authApi.twoFactorLogin(v.challengeToken, v.code));

export const useVerifyEmail = () => useMutation({ mutationFn: (token: string) => authApi.verifyEmail(token) });
export const useResendVerification = () => useMutation({ mutationFn: () => authApi.resendVerification() });

// ─── İki adımlı doğrulama ayarları ────────────────────────────────────────────
function useTwoFactorMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => Promise.all([queryClient.invalidateQueries({ queryKey: authKeys.twoFactor }), queryClient.invalidateQueries({ queryKey: authKeys.me })]),
  });
}

export const useTwoFactorSetup = () => useMutation({ mutationFn: () => twoFactorApi.setup() });
export const useEnableTwoFactor = () => useTwoFactorMutation((v: { setupToken: string; code: string }) => twoFactorApi.enable(v.setupToken, v.code));
export const useDisableTwoFactor = () => useTwoFactorMutation((v: { password: string; code: string }) => twoFactorApi.disable(v.password, v.code));
export const useRegenerateRecoveryCodes = () => useTwoFactorMutation((code: string) => twoFactorApi.regenerate(code));

export const useForgotPassword = () => useMutation({ mutationFn: (email: string) => authApi.forgotPassword(email) });
export const useResetPassword = () => useMutation({ mutationFn: (v: { token: string; password: string }) => authApi.resetPassword(v.token, v.password) });

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout().catch(() => null),
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(authKeys.me, null);
    },
  });
}

export const useTwoFactorStatus = () => useQuery({ queryKey: authKeys.twoFactor, queryFn: twoFactorApi.status });
