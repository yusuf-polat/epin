export type Role = 'USER' | 'DESTEK' | 'ADMIN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  canSell: boolean;
  walletBalance: number;
  avatarUrl?: string | null;
  phone?: string | null;
  createdAt?: string;
  store?: { id: string; name: string; slug: string; isActive: boolean } | null;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
}

/** 2FA açık hesaplarda giriş ikinci adım ister */
export interface TwoFactorChallenge {
  twoFactorRequired: true;
  challengeToken: string;
}

export type LoginResult = { user: AuthUser } | TwoFactorChallenge;

export const isChallenge = (r: LoginResult): r is TwoFactorChallenge => 'twoFactorRequired' in r;

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
  setupToken: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
  recoveryCodesLeft: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
  acceptTerms: true;
}

export const isStaff = (user?: AuthUser | null) => user?.role === 'ADMIN' || user?.role === 'DESTEK';
export const isSeller = (user?: AuthUser | null) => user?.role === 'ADMIN' || user?.canSell === true;
