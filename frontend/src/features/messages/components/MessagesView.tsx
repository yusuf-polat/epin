'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime, timeAgo } from '@/lib/utils/format';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useConversationMessages, useConversations, useSendMessage, useStartConversation } from '../hooks/useMessages';
import { sendMessageSchema, SendMessageValues } from '../schemas/message.schema';
import { MAX_MESSAGE_LENGTH } from '../constants';

function ChatPanel({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { user } = useAuth();
  const thread = useConversationMessages(conversationId);
  const send = useSendMessage(conversationId);
  const endRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, reset, formState } = useForm<SendMessageValues>({ resolver: zodResolver(sendMessageSchema) });
  const count = thread.data?.messages.length ?? 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [count]);

  const submit = handleSubmit(async ({ text }) => {
    try {
      await send.mutateAsync(text);
      reset({ text: '' });
    } catch {
      // Hata mesajı mutation durumundan gösterilir
    }
  });

  if (thread.isPending) return <div className="flex-1 flex items-center justify-center text-xs text-[#64748b]">Yükleniyor...</div>;
  if (thread.isError) return <div className="flex-1 flex items-center justify-center text-xs text-rose-300 p-6">{getErrorMessage(thread.error)}</div>;
  const { conversation, messages } = thread.data;

  return (
    <>
      <header className="p-4 border-b border-[#1c1f2b] flex items-center gap-3">
        <button type="button" onClick={onBack} className="md:hidden text-[#94a3b8]" aria-label="Sohbetlere dön">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <UserAvatar name={conversation.otherUser.name} avatarUrl={conversation.otherUser.avatarUrl} size="sm" />
        <div className="min-w-0">
          <div className="text-sm font-bold text-white truncate">{conversation.otherUser.name}</div>
          {conversation.product && (
            <Link href={`/urun/${conversation.product.slug}`} className="text-[11px] text-[#38bdf8] hover:underline truncate block">
              {conversation.product.title}
            </Link>
          )}
        </div>
      </header>
      <div className="flex-1 p-4 overflow-y-auto max-h-[480px] flex flex-col gap-2">
        {messages.length === 0 && <p className="text-xs text-[#64748b] text-center py-10">İlk mesajı siz gönderin.</p>}
        {messages.map((m) => {
          const mine = m.senderId === user?.id;
          return (
            <div key={m.id} className={`max-w-[80%] ${mine ? 'self-end' : 'self-start'}`}>
              <div className={`px-3.5 py-2 rounded-2xl text-xs whitespace-pre-line break-words ${mine ? 'bg-[#2563eb] text-white rounded-br-sm' : 'bg-[#161a28] text-[#e2e8f0] rounded-bl-sm'}`}>{m.text}</div>
              <div className={`text-[9px] text-[#64748b] mt-0.5 ${mine ? 'text-right' : ''}`}>
                {formatDateTime(m.createdAt)}
                {mine && m.isRead ? ' · Okundu' : ''}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {(send.error || formState.errors.text) && (
        <div className="mx-4 mb-2 p-2 rounded-lg bg-rose-500/10 text-rose-300 text-xs">{formState.errors.text?.message ?? getErrorMessage(send.error)}</div>
      )}
      <form onSubmit={submit} className="p-3 border-t border-[#1c1f2b] flex gap-2">
        <input
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Mesajınızı yazın..."
          autoComplete="off"
          className="flex-1 px-4 py-2.5 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs text-white focus:outline-none focus:border-[#38bdf8]"
          {...register('text')}
        />
        <button type="submit" disabled={send.isPending} className="px-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white disabled:opacity-50" aria-label="Gönder">
          <span className="material-symbols-outlined text-base">send</span>
        </button>
      </form>
    </>
  );
}

export default function MessagesView() {
  const params = useSearchParams();
  const conversations = useConversations();
  const start = useStartConversation();
  const [activeId, setActiveId] = useState<string | null>(params.get('conv'));
  const [startError, setStartError] = useState<string | null>(null);
  const started = useRef(false);

  // ?target=...&product=... ile gelindiyse sohbet başlatılır / mevcut olan açılır
  useEffect(() => {
    const target = params.get('target');
    if (!target || started.current) return;
    started.current = true;
    start
      .mutateAsync({ targetUserId: target, productId: params.get('product') ?? undefined })
      .then((c) => setActiveId(c.id))
      .catch((err) => setStartError(getErrorMessage(err)));
  }, [params, start]);

  // Parametre yoksa ilk sohbet açılır (masaüstü)
  useEffect(() => {
    if (!activeId && !params.get('target') && conversations.data?.[0] && window.matchMedia('(min-width: 768px)').matches) {
      setActiveId(conversations.data[0].id);
    }
  }, [activeId, conversations.data, params]);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400">chat</span>
          <h1 className="font-display font-extrabold text-xl text-white">Mesajlarım</h1>
        </div>
        <p className="text-xs text-[#94a3b8] mt-1">Güvenliğiniz için ödeme ve kod paylaşımını platform dışına taşımayınız.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 min-h-[520px]">
        <aside className={`bg-[#10121a] rounded-2xl border border-[#1c1f2b] overflow-hidden ${activeId ? 'hidden md:block' : ''}`}>
          {conversations.isPending ? (
            <div className="p-6 text-xs text-[#64748b]">Yükleniyor...</div>
          ) : !conversations.data?.length ? (
            <div className="p-6 text-xs text-[#64748b]">Henüz sohbetiniz yok. Ürün sayfalarındaki &quot;Satıcıya Sor&quot; ile sohbet başlatabilirsiniz.</div>
          ) : (
            <ul className="divide-y divide-[#1c1f2b] max-h-[600px] overflow-y-auto">
              {conversations.data.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setActiveId(c.id)} className={`w-full p-3 flex items-center gap-3 text-left transition-colors ${activeId === c.id ? 'bg-[#161a28]' : 'hover:bg-[#141620]'}`}>
                    <UserAvatar name={c.otherUser.name} avatarUrl={c.otherUser.avatarUrl} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate">{c.otherUser.name}</span>
                        <span className="text-[9px] text-[#64748b] shrink-0">{timeAgo(c.lastMessageAt)}</span>
                      </div>
                      <p className="text-[11px] text-[#94a3b8] truncate">{c.lastMessage ?? 'Yeni sohbet'}</p>
                    </div>
                    {c.unreadCount > 0 && activeId !== c.id && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#2563eb] text-white text-[10px] font-bold flex items-center justify-center">{c.unreadCount}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className={`bg-[#10121a] rounded-2xl border border-[#1c1f2b] flex flex-col ${activeId ? '' : 'hidden md:flex'}`}>
          {activeId ? (
            <ChatPanel key={activeId} conversationId={activeId} onBack={() => setActiveId(null)} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[#64748b] p-6">{startError ?? 'Bir sohbet seçin.'}</div>
          )}
        </section>
      </div>
    </div>
  );
}
