'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDocumentVisible } from '@/hooks/useDocumentVisible';
import { notificationApi } from '../services/notification.api';
import { notificationKeys, UNREAD_POLL_MS } from '../constants';
import { NotificationType } from '../types';

/** Okunmamış sayısı; yalnızca sekme görünürken yoklanır */
export function useUnreadCount(enabled = true) {
  const visible = useDocumentVisible();
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: notificationApi.unreadCount,
    enabled,
    refetchInterval: visible ? UNREAD_POLL_MS : false,
    select: (d) => d.count,
  });
}

export const useNotifications = (params: { page: number; limit: number; type?: NotificationType }, enabled = true) =>
  useQuery({ queryKey: notificationKeys.list(params), queryFn: () => notificationApi.list(params), enabled, placeholderData: keepPreviousData });

function useNotificationMutation<TVars>(fn: (v: TVars) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: notificationKeys.all }) });
}

export const useMarkNotificationRead = () => useNotificationMutation((id: string) => notificationApi.markRead(id));
export const useMarkAllNotificationsRead = () => useNotificationMutation(() => notificationApi.markAllRead());
export const useDeleteNotification = () => useNotificationMutation((id: string) => notificationApi.remove(id));
