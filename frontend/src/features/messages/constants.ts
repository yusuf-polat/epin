export const messageKeys = {
  all: ['messages'] as const,
  conversations: () => [...messageKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...messageKeys.all, 'conversation', id] as const,
};

/** Açık sohbet ve sohbet listesi yoklama aralığı (sekme görünürken) */
export const MESSAGE_POLL_MS = 5000;
export const MAX_MESSAGE_LENGTH = 2000;
