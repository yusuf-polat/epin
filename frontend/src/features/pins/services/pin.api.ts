import { apiClient } from '@/lib/api';
import { DigitalPin, RevealedPin } from '../types';

export const pinApi = {
  listMine: (page = 1) => apiClient.getPage<DigitalPin>('/pins', { params: { page } }),
  reveal: (id: string) => apiClient.get<RevealedPin>(`/pins/${id}/reveal`),
};
