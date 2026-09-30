import { apiClient, RequestOptions } from '@/lib/api';
import type { Product } from '@/features/products/types';
import { Store, StoreInput } from '../types';

export const storeApi = {
  list: (params: { page?: number; limit?: number; search?: string } = {}, options?: RequestOptions) =>
    apiClient.getPage<Store>('/stores', { ...options, params }),
  getBySlug: (slug: string, options?: RequestOptions) => apiClient.get<Store>(`/stores/${encodeURIComponent(slug)}`, options),
  products: (slug: string, page = 1, options?: RequestOptions) =>
    apiClient.getPage<Product>(`/stores/${encodeURIComponent(slug)}/products`, { ...options, params: { page, limit: 12 } }),
  mine: () => apiClient.get<Store | null>('/stores/mine'),
  create: (input: StoreInput) => apiClient.post<Store>('/stores', input),
  update: (input: Pick<StoreInput, 'description' | 'logoUrl' | 'coverUrl'>) => apiClient.put<Store>('/stores', input),

  adminList: (params: { page?: number; limit?: number; search?: string }) => apiClient.getPage<Store>('/stores/admin', { params }),
  toggleActive: (id: string) => apiClient.patch<Store>(`/stores/admin/${id}/toggle-active`),
};
