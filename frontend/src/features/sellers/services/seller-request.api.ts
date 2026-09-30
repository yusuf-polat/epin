import { apiClient } from '@/lib/api';
import { SellerRequest, SellerRequestStatus } from '../types';

export const sellerRequestApi = {
  create: (reason: string) => apiClient.post<SellerRequest>('/seller-requests', { reason }),
  listMine: () => apiClient.get<SellerRequest[]>('/seller-requests/mine'),
  list: (status?: SellerRequestStatus) => apiClient.get<SellerRequest[]>('/seller-requests', { params: { status } }),
  resolve: (id: string, action: 'APPROVED' | 'REJECTED', adminNotes?: string) =>
    apiClient.post<SellerRequest>(`/seller-requests/${id}/resolve`, { action, adminNotes }),
};
