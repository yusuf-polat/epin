import { apiClient } from '@/lib/api';
import { AdminGateway, AdminPayment, CheckoutResult, OnlineProvider, Payment, PaymentMethod, PaymentProvider, UpdateGatewayInput } from '../types';

export interface AdminPaymentParams {
  page: number;
  status?: string;
  provider?: string;
  search?: string;
}

export const paymentApi = {
  methods: () => apiClient.get<PaymentMethod[]>('/payments/methods'),
  checkout: (provider: OnlineProvider, amount: number) => apiClient.post<CheckoutResult>('/payments/checkout', { provider, amount }),
  get: (id: string) => apiClient.get<Payment>(`/payments/${id}`),
  mine: (page: number) => apiClient.getPage<Payment>('/payments/mine', { params: { page } }),

  // Yönetim
  gateways: () => apiClient.get<AdminGateway[]>('/payments/admin/gateways'),
  updateGateway: (provider: PaymentProvider, input: UpdateGatewayInput) => apiClient.put<AdminGateway>(`/payments/admin/gateways/${provider}`, input),
  adminList: (params: AdminPaymentParams) => apiClient.getPage<AdminPayment>('/payments/admin', { params: { ...params } }),
  sync: (id: string) => apiClient.post<Payment>(`/payments/admin/${id}/sync`),
};
