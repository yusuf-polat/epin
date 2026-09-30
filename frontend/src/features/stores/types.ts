export interface StoreStats {
  totalSales: number;
  activeListings: number;
  avgRating: number | null;
  reviewCount: number;
  memberSince?: string;
}

export interface Store {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string;
  coverUrl: string;
  isActive: boolean;
  createdAt: string;
  owner: { id: string; name: string; avatarUrl?: string | null; createdAt: string; email?: string };
  stats?: StoreStats;
}

export interface StoreInput {
  name: string;
  slug: string;
  description?: string;
  logoUrl: string;
  coverUrl: string;
}
