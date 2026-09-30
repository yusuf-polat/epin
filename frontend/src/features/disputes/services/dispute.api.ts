import { apiClient } from '@/lib/api';
import { Dispute, DisputeReason, DisputeStatus } from '../types';

export const disputeApi = {
  create: (input: { orderId: string; reason: DisputeReason; description: string; videoUrl: string }) =>
    apiClient.post<Dispute>('/disputes', input),
  get: (id: string) => apiClient.get<Dispute>(`/disputes/${id}`),
  listMine: () => apiClient.get<Dispute[]>('/disputes/mine'),
  listForSeller: () => apiClient.get<Dispute[]>('/disputes/seller'),
  listAll: (status?: DisputeStatus) => apiClient.get<Dispute[]>('/disputes', { params: { status } }),
  cancel: (id: string) => apiClient.post<Dispute>(`/disputes/${id}/cancel`),
  escalate: (id: string, description: string) => apiClient.post<Dispute>(`/disputes/${id}/escalate`, { description }),
  sellerRespond: (id: string, input: { action: 'REFUND' | 'REPLACE' | 'REJECT'; response: string; replacementCode?: string }) =>
    apiClient.post<Dispute>(`/disputes/${id}/seller-respond`, input),
  resolve: (id: string, input: { decision: 'BUYER' | 'SELLER'; adminNotes: string }) => apiClient.post<Dispute>(`/disputes/${id}/resolve`, input),
};
