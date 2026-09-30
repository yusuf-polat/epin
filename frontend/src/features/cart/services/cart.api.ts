import { apiClient } from '@/lib/api';
import { ServerCart } from '../types';

export const cartApi = {
  get: () => apiClient.get<ServerCart>('/cart'),
  add: (variantId: string, quantity: number) => apiClient.post<ServerCart>('/cart/items', { variantId, quantity }),
  update: (itemId: string, quantity: number) => apiClient.patch<ServerCart>(`/cart/items/${itemId}`, { quantity }),
  remove: (itemId: string) => apiClient.delete<ServerCart>(`/cart/items/${itemId}`),
  clear: () => apiClient.delete<ServerCart>('/cart'),
  merge: (items: { variantId: string; quantity: number }[]) => apiClient.post<ServerCart>('/cart/merge', { items }),
};
