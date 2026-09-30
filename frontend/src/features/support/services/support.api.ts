import { apiClient } from '@/lib/api';
import { SupportTicket, TicketMessage, TicketPriority, TicketStatus } from '../types';

export const supportApi = {
  create: (input: { subject: string; category: string; priority: TicketPriority; message: string }) => apiClient.post<SupportTicket>('/support/tickets', input),
  listMine: () => apiClient.get<SupportTicket[]>('/support/tickets'),
  get: (id: string) => apiClient.get<SupportTicket>(`/support/tickets/${id}`),
  reply: (id: string, message: string) => apiClient.post<TicketMessage>(`/support/tickets/${id}/messages`, { message }),
  listAll: (params: { status?: TicketStatus; search?: string }) => apiClient.get<SupportTicket[]>('/support/admin/tickets', { params }),
  update: (id: string, input: { status?: TicketStatus; priority?: TicketPriority }) => apiClient.patch<SupportTicket>(`/support/admin/tickets/${id}`, input),
};
