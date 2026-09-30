'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime, timeAgo } from '@/lib/utils/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, inputClass } from '@/components/ui/FormField';
import { Toast, useToast } from '@/components/shared/Toast';
import { useAdminTickets, useCreateTicket, useMyTickets, useReplyTicket, useTicket, useUpdateTicket } from '../hooks/useSupport';
import { createTicketSchema, CreateTicketValues, replySchema, ReplyValues } from '../schemas/support.schema';
import { PRIORITY_LABELS, TICKET_CATEGORIES, TICKET_STATUS_LABELS } from '../constants';
import { TicketPriority, TicketStatus } from '../types';

type Notify = (msg: string, ok: boolean) => void;

function CreateTicketModal({ onClose, onCreated, notify }: { onClose: () => void; onCreated: (id: string) => void; notify: Notify }) {
  const create = useCreateTicket();
  const { register, handleSubmit, formState } = useForm<CreateTicketValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { category: TICKET_CATEGORIES[0], priority: 'MEDIUM' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      const ticket = await create.mutateAsync(values);
      notify(`#${ticket.ticketNumber} numaralı talebiniz oluşturuldu.`, true);
      onCreated(ticket.id);
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  });

  return (
    <Modal open onClose={() => !create.isPending && onClose()} title="Yeni Destek Talebi">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FormField label="Konu" error={formState.errors.subject?.message}>
          <input maxLength={150} className={inputClass} {...register('subject')} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Kategori">
            <select className={inputClass} {...register('category')}>
              {TICKET_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Öncelik">
            <select className={inputClass} {...register('priority')}>
              {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField label="Mesaj" error={formState.errors.message?.message}>
          <textarea rows={5} maxLength={5000} className={inputClass} placeholder="Sorununuzu detaylı anlatın" {...register('message')} />
        </FormField>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={create.isPending}>
            Vazgeç
          </Button>
          <Button type="submit" className="flex-1" loading={create.isPending}>
            Talep Oluştur
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TicketThread({ id, isStaff, onBack, notify }: { id: string; isStaff: boolean; onBack: () => void; notify: Notify }) {
  const ticket = useTicket(id);
  const reply = useReplyTicket();
  const update = useUpdateTicket();
  const endRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, reset, formState } = useForm<ReplyValues>({ resolver: zodResolver(replySchema) });
  const count = ticket.data?.messages?.length ?? 0;

  useEffect(() => endRef.current?.scrollIntoView(), [count]);

  const submit = handleSubmit(async ({ message }) => {
    try {
      await reply.mutateAsync({ id, message });
      reset({ message: '' });
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  });

  const setStatus = async (status: TicketStatus) => {
    try {
      await update.mutateAsync({ id, status });
      notify('Talep durumu güncellendi.', true);
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  };

  if (ticket.isPending) return <div className="flex-1 flex items-center justify-center text-xs text-[#64748b]">Yükleniyor...</div>;
  if (ticket.isError) return <div className="flex-1 flex items-center justify-center text-xs text-rose-300 p-6">{getErrorMessage(ticket.error)}</div>;
  const t = ticket.data;

  return (
    <>
      <header className="p-4 border-b border-[#1c1f2b] flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={onBack} className="md:hidden text-[#94a3b8]" aria-label="Listeye dön">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="font-mono text-xs text-[#64748b]">#{t.ticketNumber}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${TICKET_STATUS_LABELS[t.status].className}`}>{TICKET_STATUS_LABELS[t.status].label}</span>
          <span className="text-[10px] text-[#94a3b8]">{PRIORITY_LABELS[t.priority]} öncelik</span>
        </div>
        <h2 className="text-sm font-bold text-white">{t.subject}</h2>
        <div className="text-[11px] text-[#64748b]">
          {t.category}
          {isStaff && t.user && ` · ${t.user.name} (${t.user.email})`}
        </div>
        {isStaff && (
          <div className="flex flex-wrap gap-2">
            {(['IN_PROGRESS', 'RESOLVED', 'CLOSED'] as TicketStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                disabled={t.status === s || update.isPending}
                onClick={() => setStatus(s)}
                className="px-3 py-1 rounded-lg bg-[#161824] border border-[#222534] text-[11px] font-bold text-white disabled:opacity-40"
              >
                {TICKET_STATUS_LABELS[s].label}
              </button>
            ))}
          </div>
        )}
      </header>
      <div className="flex-1 p-4 overflow-y-auto max-h-[440px] flex flex-col gap-3">
        {t.messages?.map((m) => (
          <div key={m.id} className={`max-w-[85%] ${m.isAdminReply === isStaff ? 'self-end' : 'self-start'}`}>
            <div className="text-[10px] text-[#64748b] mb-0.5">
              {m.isAdminReply ? `${m.sender.name} (Destek)` : m.sender.name} · {formatDateTime(m.createdAt)}
            </div>
            <div className={`px-3.5 py-2 rounded-2xl text-xs whitespace-pre-line break-words ${m.isAdminReply ? 'bg-purple-600/30 text-purple-50' : 'bg-[#161a28] text-[#e2e8f0]'}`}>{m.message}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {t.status !== 'CLOSED' ? (
        <form onSubmit={submit} className="p-3 border-t border-[#1c1f2b] flex gap-2">
          <textarea
            rows={2}
            maxLength={5000}
            placeholder={formState.errors.message?.message ?? 'Yanıtınızı yazın...'}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs text-white focus:outline-none focus:border-[#38bdf8] resize-none"
            {...register('message')}
          />
          <button type="submit" disabled={reply.isPending} className="px-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white disabled:opacity-50" aria-label="Gönder">
            <span className="material-symbols-outlined text-base">send</span>
          </button>
        </form>
      ) : (
        <div className="p-3 border-t border-[#1c1f2b] text-center text-[11px] text-[#64748b]">Bu talep kapatıldı.</div>
      )}
    </>
  );
}

/** mode="user": kullanıcının kendi talepleri; mode="staff": destek masası */
export default function SupportTicketsView({ mode }: { mode: 'user' | 'staff' }) {
  const isStaff = mode === 'staff';
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>(isStaff ? 'OPEN' : '');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const mine = useMyTickets(!isStaff);
  const admin = useAdminTickets({ status: statusFilter || undefined, search: search || undefined }, isStaff);
  const tickets = isStaff ? admin : mine;
  const { toast, show } = useToast();
  const notify: Notify = (msg, ok) => show(msg, ok ? 'success' : 'error');

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400">{isStaff ? 'headset_mic' : 'support_agent'}</span>
              <h1 className="font-display font-extrabold text-xl text-white">{isStaff ? 'Destek Masası' : 'Destek Talepleri'}</h1>
            </div>
            <p className="text-xs text-[#94a3b8] mt-1">{isStaff ? 'Kullanıcı taleplerini yanıtlayın ve durumlarını yönetin.' : 'Sorunlarınız için destek ekibimize ulaşın.'}</p>
          </div>
          {!isStaff && <Button onClick={() => setCreateOpen(true)}>+ Yeni Talep</Button>}
        </div>
        {isStaff && (
          <div className="flex flex-col sm:flex-row gap-3">
            <select className={`${inputClass} sm:w-48`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TicketStatus | '')} aria-label="Durum filtresi">
              <option value="">Tüm Durumlar</option>
              {(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((s) => (
                <option key={s} value={s}>
                  {TICKET_STATUS_LABELS[s].label}
                </option>
              ))}
            </select>
            <form
              className="flex-1 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchInput.trim());
              }}
            >
              <input className={inputClass} value={searchInput} maxLength={100} onChange={(e) => setSearchInput(e.target.value)} placeholder="Talep no, konu, kullanıcı..." />
              <button type="submit" className="px-4 rounded-xl bg-[#161824] border border-[#222534] text-white text-xs font-bold">
                Ara
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 min-h-[480px]">
        <aside className={`bg-[#10121a] rounded-2xl border border-[#1c1f2b] overflow-hidden ${selected ? 'hidden md:block' : ''}`}>
          {tickets.isPending ? (
            <div className="p-6 text-xs text-[#64748b]">Yükleniyor...</div>
          ) : tickets.isError ? (
            <div className="p-6 text-xs text-rose-300">{getErrorMessage(tickets.error)}</div>
          ) : tickets.data.length === 0 ? (
            <div className="p-6 text-xs text-[#64748b]">Talep bulunamadı.</div>
          ) : (
            <ul className="divide-y divide-[#1c1f2b] max-h-[640px] overflow-y-auto">
              {tickets.data.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => setSelected(t.id)} className={`w-full p-4 text-left ${selected === t.id ? 'bg-[#161a28]' : 'hover:bg-[#141620]'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-[#64748b]">#{t.ticketNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${TICKET_STATUS_LABELS[t.status].className}`}>{TICKET_STATUS_LABELS[t.status].label}</span>
                    </div>
                    <div className="text-xs font-bold text-white mt-1 line-clamp-1">{t.subject}</div>
                    <div className="text-[10px] text-[#64748b] mt-0.5">
                      {isStaff && t.user ? `${t.user.name} · ` : ''}
                      {timeAgo(t.updatedAt)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className={`bg-[#10121a] rounded-2xl border border-[#1c1f2b] flex flex-col ${selected ? '' : 'hidden md:flex'}`}>
          {selected ? (
            <TicketThread key={selected} id={selected} isStaff={isStaff} onBack={() => setSelected(null)} notify={notify} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[#64748b] p-6">Bir talep seçin.</div>
          )}
        </section>
      </div>

      {createOpen && (
        <CreateTicketModal
          onClose={() => setCreateOpen(false)}
          notify={notify}
          onCreated={(id) => {
            setCreateOpen(false);
            setSelected(id);
          }}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}
