'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '../services/support.api';
import { supportKeys } from '../constants';
import { TicketPriority, TicketStatus } from '../types';

export const useMyTickets = (enabled = true) => useQuery({ queryKey: supportKeys.mine(), queryFn: supportApi.listMine, enabled });

export const useAdminTickets = (filter: { status?: TicketStatus; search?: string }, enabled = true) =>
  useQuery({ queryKey: supportKeys.admin(filter), queryFn: () => supportApi.listAll(filter), enabled });

export const useTicket = (id: string | null) => useQuery({ queryKey: supportKeys.ticket(id ?? ''), queryFn: () => supportApi.get(id!), enabled: !!id });

function useSupportMutation<TVars, TRes>(fn: (v: TVars) => Promise<TRes>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: supportKeys.all }) });
}

export const useCreateTicket = () => useSupportMutation(supportApi.create);
export const useReplyTicket = () => useSupportMutation((v: { id: string; message: string }) => supportApi.reply(v.id, v.message));
export const useUpdateTicket = () =>
  useSupportMutation((v: { id: string; status?: TicketStatus; priority?: TicketPriority }) => supportApi.update(v.id, { status: v.status, priority: v.priority }));
