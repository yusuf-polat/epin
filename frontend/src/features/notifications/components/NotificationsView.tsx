'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/utils/format';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Pagination } from '@/components/shared/Pagination';
import { useDeleteNotification, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../hooks/useNotifications';
import { NOTIFICATION_ICONS, NOTIFICATION_LABELS } from '../constants';
import { NotificationItem, NotificationType } from '../types';

const TYPES = Object.keys(NOTIFICATION_LABELS) as NotificationType[];

export default function NotificationsView() {
  const [type, setType] = useState<NotificationType | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const list = useNotifications({ page, limit: 10, type: type === 'ALL' ? undefined : type });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();
  const unread = Number(list.data?.meta.unreadCount ?? 0);

  const read = (n: NotificationItem) => !n.isRead && markRead.mutate(n.id);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400">notifications</span>
              <h1 className="font-display font-extrabold text-xl text-white">Bildirimlerim</h1>
            </div>
            <p className="text-xs text-[#94a3b8] mt-1">{unread > 0 ? `${unread} okunmamış bildirim` : 'Tüm bildirimler okundu'}</p>
          </div>
          {unread > 0 && (
            <button type="button" onClick={() => markAll.mutate()} className="px-4 py-2 rounded-xl bg-[#161824] border border-[#222534] text-[#38bdf8] text-xs font-bold">
              Tümünü Okundu Say
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['ALL', ...TYPES] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${type === t ? 'bg-[#2563eb] border-[#2563eb] text-white' : 'bg-[#090a0f] border-[#1c1f2b] text-[#94a3b8] hover:text-white'}`}
            >
              {t === 'ALL' ? 'Tümü' : NOTIFICATION_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState message={getErrorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState icon="notifications_off" title="Bildirim yok" />
      ) : (
        <div className="flex flex-col gap-3">
          {list.data.items.map((n) => (
            <div key={n.id} className={`p-4 rounded-2xl border flex items-start gap-3 ${n.isRead ? 'bg-[#10121a] border-[#1c1f2b]' : 'bg-[#141828] border-[#38bdf8]/40'}`}>
              <div className="w-10 h-10 rounded-xl bg-[#161a28] border border-[#232a40] text-[#38bdf8] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">{NOTIFICATION_ICONS[n.type] ?? 'notifications'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white">{n.title}</span>
                  <span className="text-[10px] font-mono text-[#64748b] shrink-0">{formatDateTime(n.createdAt)}</span>
                </div>
                <p className="text-xs text-[#94a3b8] mt-1">{n.message}</p>
                <div className="flex items-center gap-4 mt-2">
                  {n.link && (
                    <Link href={n.link} onClick={() => read(n)} className="text-[11px] font-bold text-[#38bdf8] hover:underline">
                      Görüntüle →
                    </Link>
                  )}
                  {!n.isRead && (
                    <button type="button" onClick={() => read(n)} className="text-[11px] font-bold text-[#94a3b8] hover:text-white">
                      Okundu say
                    </button>
                  )}
                  <button type="button" onClick={() => remove.mutate(n.id)} className="text-[11px] font-bold text-rose-400 hover:text-rose-300 ml-auto">
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {list.data && <Pagination page={list.data.meta.page} totalPages={list.data.meta.totalPages} onChange={setPage} />}
    </div>
  );
}
