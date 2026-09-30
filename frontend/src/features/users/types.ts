import type { Role } from '@/features/auth/types';

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  canSell: boolean;
  sellerApprovedAt: string | null;
  walletBalance: number;
  isBanned: boolean;
  bannedAt: string | null;
  banReason: string | null;
  createdAt: string;
  store: { id: string; name: string; slug: string; isActive: boolean } | null;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}
