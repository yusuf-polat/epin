export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  imageUrl: string;
  sortOrder: number;
  /** Satış komisyonu (%); null ise platform varsayılanı */
  commissionRate: number | null;
  _count?: { products: number };
}

export interface CategoryInput {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  imageUrl: string;
  sortOrder?: number;
  commissionRate?: number | null;
}
