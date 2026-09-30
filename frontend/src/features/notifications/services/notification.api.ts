import { apiClient } from '@/lib/api';
import { NotificationItem, NotificationType } from '../types';

export const notificationApi = {
  list: (params: { page?: number; limit?: number; type?: NotificationType } = {}) =>
    apiClient.getPage<NotificationItem>('/notifications', { params }),
  unreadCount: () => apiClient.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => apiClient.patch<null>(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch<null>('/notifications/read-all'),
  remove: (id: string) => apiClient.delete<null>(`/notifications/${id}`),
};
