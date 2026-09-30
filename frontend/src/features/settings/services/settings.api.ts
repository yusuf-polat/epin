import { apiClient } from '@/lib/api';
import { CommissionSettings, SmtpSettings, UpdateSmtpInput } from '../types';

export const settingsApi = {
  /** Herkese açık ücretler (para çekme önizlemesi vb.) */
  commission: () => apiClient.get<CommissionSettings>('/settings/public'),
  updateCommission: (input: CommissionSettings) => apiClient.put<CommissionSettings>('/settings/commission', input),
  smtp: () => apiClient.get<SmtpSettings>('/settings/smtp'),
  updateSmtp: (input: UpdateSmtpInput) => apiClient.put<SmtpSettings>('/settings/smtp', input),
  testSmtp: (to: string) => apiClient.postWithMessage<{ sent: boolean }>('/settings/smtp/test', { to }),
};
