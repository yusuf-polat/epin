/** TanStack Query anahtarları */
export const authKeys = {
  me: ['auth', 'me'] as const,
  twoFactor: ['auth', '2fa'] as const,
};

export const ROLE_LABELS = { ADMIN: 'YÖNETİCİ', DESTEK: 'DESTEK EKİBİ', USER: 'KULLANICI' } as const;

export const DEFAULT_REDIRECT = '/hesabim';
