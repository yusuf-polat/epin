import { apiClient } from '@/lib/api';
import { Conversation, ConversationSummary, Message } from '../types';

export const messageApi = {
  conversations: () => apiClient.get<ConversationSummary[]>('/messages/conversations'),
  start: (targetUserId: string, productId?: string) => apiClient.post<Conversation>('/messages/conversations', { targetUserId, productId }),
  messages: (id: string) => apiClient.get<{ conversation: Conversation; messages: Message[] }>(`/messages/conversations/${id}`),
  send: (id: string, text: string) => apiClient.post<Message>(`/messages/conversations/${id}/messages`, { text }),
};
