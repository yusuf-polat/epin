import { apiClient, RequestOptions } from '@/lib/api';
import { AuthUser, LoginInput, LoginResult, RegisterInput, TwoFactorSetup, TwoFactorStatus } from '../types';

export const authApi = {
  login: (input: LoginInput) => apiClient.post<LoginResult>('/auth/login', input),
  register: (input: RegisterInput) => apiClient.post<{ user: AuthUser }>('/auth/register', input),
  google: (accessToken: string) => apiClient.post<LoginResult>('/auth/google', { accessToken }),
  twoFactorLogin: (challengeToken: string, code: string) => apiClient.post<{ user: AuthUser }>('/auth/2fa/login', { challengeToken, code }),
  verifyEmail: (token: string) => apiClient.post<null>('/auth/verify-email', { token }),
  resendVerification: () => apiClient.post<null>('/auth/resend-verification'),
  logout: () => apiClient.post<null>('/auth/logout'),
  forgotPassword: (email: string) => apiClient.post<null>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => apiClient.post<null>('/auth/reset-password', { token, password }),
  me: (options?: RequestOptions) => apiClient.get<AuthUser>('/auth/me', options),
};

export const twoFactorApi = {
  status: () => apiClient.get<TwoFactorStatus>('/auth/2fa'),
  setup: () => apiClient.post<TwoFactorSetup>('/auth/2fa/setup'),
  enable: (setupToken: string, code: string) => apiClient.post<{ recoveryCodes: string[] }>('/auth/2fa/enable', { setupToken, code }),
  disable: (password: string, code: string) => apiClient.post<null>('/auth/2fa/disable', { password, code }),
  regenerate: (code: string) => apiClient.post<{ recoveryCodes: string[] }>('/auth/2fa/recovery-codes', { code }),
};
