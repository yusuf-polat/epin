import { apiClient, RequestOptions } from '@/lib/api';
import { DashboardReport } from '../types';

export const reportApi = {
  dashboard: (options?: RequestOptions) => apiClient.get<DashboardReport>('/reports/dashboard', options),
};
