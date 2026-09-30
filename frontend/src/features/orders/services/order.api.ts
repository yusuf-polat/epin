import { apiClient } from '@/lib/api';
import { AdminOrderParams, CheckoutResult, Order } from '../types';

export const orderApi = {
  /** acceptTerms: mesafeli satış sözleşmesi ve ön bilgilendirme formu onayı */
  checkout: (items: { variantId: string; quantity: number }[]) =>
    apiClient.post<CheckoutResult>('/orders/checkout', { paymentMethod: 'WALLET', acceptTerms: true, items }),
  listMine: (page = 1) => apiClient.getPage<Order>('/orders', { params: { page } }),
  get: (id: string) => apiClient.get<Order>(`/orders/${id}`),
  confirm: (id: string) => apiClient.post<Order>(`/orders/${id}/confirm`),
  cancelOverdue: (id: string) => apiClient.post<Order>(`/orders/${id}/cancel`),

  // Satıcı
  listSales: (filter: 'pending' | 'all' = 'all', page = 1) => apiClient.getPage<Order>('/orders/sales', { params: { filter, page } }),
  deliver: (id: string, input: { deliveryNotes: string; codes?: string[] }) => apiClient.post<Order>(`/orders/${id}/deliver`, input),
  sellerCancel: (id: string, reason: string) => apiClient.post<Order>(`/orders/${id}/seller-cancel`, { reason }),

  // Yönetim
  adminList: (params: AdminOrderParams) => apiClient.getPage<Order>('/orders/admin', { params: { ...params } }),
};
