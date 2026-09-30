'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDocumentVisible } from '@/hooks/useDocumentVisible';
import { messageApi } from '../services/message.api';
import { MESSAGE_POLL_MS, messageKeys } from '../constants';

export function useConversations() {
  const visible = useDocumentVisible();
  return useQuery({ queryKey: messageKeys.conversations(), queryFn: messageApi.conversations, refetchInterval: visible ? MESSAGE_POLL_MS : false });
}

/** Açık sohbetin mesajları; okununca sohbet listesindeki sayaç da yenilenir */
export function useConversationMessages(id: string | null) {
  const visible = useDocumentVisible();
  return useQuery({
    queryKey: messageKeys.conversation(id ?? ''),
    queryFn: () => messageApi.messages(id!),
    enabled: !!id,
    refetchInterval: visible ? MESSAGE_POLL_MS : false,
  });
}

export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { targetUserId: string; productId?: string }) => messageApi.start(v.targetUserId, v.productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: messageKeys.conversations() }),
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => messageApi.send(conversationId, text),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: messageKeys.conversation(conversationId) }),
        qc.invalidateQueries({ queryKey: messageKeys.conversations() }),
      ]),
  });
}
