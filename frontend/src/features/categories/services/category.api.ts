import { apiClient, RequestOptions } from '@/lib/api';
import { Category, CategoryInput } from '../types';

export const categoryApi = {
  list: (options?: RequestOptions) => apiClient.get<Category[]>('/categories', options),
  create: (input: CategoryInput) => apiClient.post<Category>('/categories', input),
  update: (id: string, input: Partial<CategoryInput>) => apiClient.put<Category>(`/categories/${id}`, input),
  remove: (id: string) => apiClient.delete<null>(`/categories/${id}`),
};
