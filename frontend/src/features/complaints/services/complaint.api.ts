import { apiClient } from '@/lib/api';
import { AdminComplaint, CreateComplaintInput } from '../types';

export interface AdminComplaintParams {
  page: number;
  status?: string;
  targetType?: string;
}

export const complaintApi = {
  create: (input: CreateComplaintInput) => apiClient.post('/complaints', input),
  adminList: (params: AdminComplaintParams) => apiClient.getPage<AdminComplaint>('/complaints/admin', { params: { ...params } }),
  resolve: (id: string, input: { status: 'RESOLVED' | 'DISMISSED'; note: string; takeDown?: boolean }) =>
    apiClient.post<{ closedCount: number; takenDown: boolean }>(`/complaints/admin/${id}/resolve`, input),
};
