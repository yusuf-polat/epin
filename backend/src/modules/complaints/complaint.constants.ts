export const COMPLAINT_REASONS = {
  FRAUD: 'Dolandırıcılık / çalışmayan kod',
  MISLEADING: 'Yanıltıcı veya yanlış bilgi',
  INAPPROPRIATE: 'Uygunsuz / saldırgan içerik',
  SPAM: 'Spam veya reklam',
  COPYRIGHT: 'Telif veya marka ihlali',
  OTHER: 'Diğer',
} as const;

export type ComplaintReason = keyof typeof COMPLAINT_REASONS;

/** Aynı kullanıcı 24 saatte en fazla bu kadar şikâyet açabilir */
export const MAX_DAILY_COMPLAINTS = 10;
