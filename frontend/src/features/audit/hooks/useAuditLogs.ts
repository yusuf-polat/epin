'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { auditApi } from '../services/audit.api';
import { auditKeys } from '../constants';
import { AuditParams } from '../types';

export const useAuditLogs = (params: AuditParams) =>
  useQuery({ queryKey: auditKeys.list(params), queryFn: () => auditApi.list(params), placeholderData: keepPreviousData });
