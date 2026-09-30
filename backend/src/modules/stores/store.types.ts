export interface CreateStoreDTO {
  name: string;
  slug: string;
  description?: string;
  logoUrl: string;
  coverUrl: string;
}

export interface UpdateStoreDTO {
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
}

export interface StoreListQuery {
  page: number;
  limit: number;
  search?: string;
}
