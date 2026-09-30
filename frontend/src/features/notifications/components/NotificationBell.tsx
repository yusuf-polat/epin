'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { timeAgo } from '@/lib/utils/format';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, useUnreadCount } from '../hooks/useNotifications';
import { NOTIFICATION_ICONS } from '../constants';
import { NotificationItem } from '../types';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = useUnreadCount();
  const recent = useNotifications({ page: 1, limit: 5 }, isOpen);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const unreadCount = unread.data ?? 0;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const open = (n: NotificationItem) => {
    if (!n.isRead) markRead.mutate(n.id);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={`Bildirimler${unreadCount ? ` (${unreadCount} okunmamış)` : ''}`}
        aria-expanded={isOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-[#10121a] hover:bg-[#161824] border border-[#1b1e2a] hover:border-[#38bdf8]/50 text-white transition-all"
      >
        <span className="material-symbols-outlined text-lg text-[#94a3b8]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-[#0e1017] border border-[#1c1f2b] rounded-2xl shadow-2xl p-3 z-50 flex flex-col gap-2">
          <div className="flex items-center justify-between px-2 py-1 border-b border-[#1c1f2b] pb-2">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-xs text-white">Bildirimler</span>
              {unreadCount > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">{unreadCount} yeni</span>}
            </div>
            {unreadCount > 0 && (
              <button type="button" onClick={() => markAll.mutate()} className="text-[11px] font-semibold text-[#38bdf8] hover:text-white">
                Tümünü Okundu Say
              </button>
            )}
          </div>

          <div className="max-h-[340px] overflow-y-auto flex flex-col gap-1.5">
            {recent.isPending ? (
              <div className="py-8 text-center text-xs text-[#64748b]">Yükleniyor...</div>
            ) : !recent.data || recent.data.items.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center gap-1.5">
                <span className="material-symbols-outlined text-2xl text-[#475569]">notifications_off</span>
                <span className="text-xs text-[#64748b]">Henüz bildiriminiz yok</span>
              </div>
            ) : (
              recent.data.items.map((n) => {
                const body = (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-[#161a28] border border-[#232a40] text-[#38bdf8] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-base">{NOTIFICATION_ICONS[n.type] ?? 'notifications'}</span>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white truncate">{n.title}</span>
                        <span className="text-[9px] font-mono text-[#64748b] shrink-0">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-[#94a3b8] line-clamp-2 mt-0.5">{n.message}</p>
                    </div>
                  </>
                );
                const className = `p-2.5 rounded-xl transition-colors flex items-start gap-2.5 w-full ${
                  n.isRead ? 'hover:bg-[#141620] opacity-80' : 'bg-[#141828]/60 hover:bg-[#161c33] border-l-2 border-[#38bdf8]'
                }`;
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => open(n)} className={className}>
                    {body}
                  </Link>
                ) : (
                  <button key={n.id} type="button" onClick={() => open(n)} className={className}>
                    {body}
                  </button>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-[#1c1f2b] text-center">
            <Link href="/hesabim/bildirimler" onClick={() => setIsOpen(false)} className="text-xs font-bold text-[#94a3b8] hover:text-[#38bdf8]">
              Tüm Bildirimleri Görüntüle →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
