import { apiClient } from '@/lib/api';

export type BroadcastAudience = 'ALL' | 'SELLERS' | 'BUYERS' | 'STAFF' | 'USER';

export interface BroadcastInput {
  audience: BroadcastAudience;
  email?: string;
  title: string;
  message: string;
  link?: string;
  sendEmail: boolean;
}

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  link: string | null;
  /** ALL, SELLERS... veya tek kullanıcıda "USER:eposta" */
  audience: string;
  recipientCount: number;
  sendEmail: boolean;
  emailCount: number;
  createdAt: string;
  sentBy: { id: string; name: string } | null;
}

export const broadcastApi = {
  send: (input: BroadcastInput) => apiClient.postWithMessage<{ id: string; recipientCount: number; emailQueued: boolean }>('/notifications/admin/broadcast', input),
  recipientCount: (audience: BroadcastAudience, email?: string) =>
    apiClient.get<{ count: number }>('/notifications/admin/recipient-count', { params: { audience, email } }),
  history: (page: number) => apiClient.getPage<Broadcast>('/notifications/admin/broadcasts', { params: { page } }),
};
