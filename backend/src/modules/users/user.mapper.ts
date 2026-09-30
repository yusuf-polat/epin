import { toNumber } from '@/utils/money';
import { PublicUserRecord } from './user.repository';

export type PublicUser = Omit<PublicUserRecord, 'walletBalance' | 'emailVerifiedAt' | 'twoFactorEnabledAt'> & {
  walletBalance: number;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
};

export const toPublicUser = ({ emailVerifiedAt, twoFactorEnabledAt, ...user }: PublicUserRecord): PublicUser => ({
  ...user,
  walletBalance: toNumber(user.walletBalance),
  emailVerified: emailVerifiedAt !== null,
  twoFactorEnabled: twoFactorEnabledAt !== null,
});
