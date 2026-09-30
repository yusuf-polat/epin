'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../services/settings.api';
import { CommissionSettings, UpdateSmtpInput } from '../types';

export const settingsKeys = {
  commission: ['settings', 'commission'] as const,
  smtp: ['settings', 'smtp'] as const,
};

export const useCommissionSettings = () => useQuery({ queryKey: settingsKeys.commission, queryFn: settingsApi.commission, staleTime: 60_000 });

export function useUpdateCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CommissionSettings) => settingsApi.updateCommission(input),
    onSuccess: (data) => qc.setQueryData(settingsKeys.commission, data),
  });
}

export const useSmtpSettings = () => useQuery({ queryKey: settingsKeys.smtp, queryFn: settingsApi.smtp });

export function useUpdateSmtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSmtpInput) => settingsApi.updateSmtp(input),
    onSuccess: (data) => qc.setQueryData(settingsKeys.smtp, data),
  });
}

export const useTestSmtp = () => useMutation({ mutationFn: (to: string) => settingsApi.testSmtp(to) });
