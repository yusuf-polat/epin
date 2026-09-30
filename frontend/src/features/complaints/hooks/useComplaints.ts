'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminComplaintParams, complaintApi } from '../services/complaint.api';
import { complaintKeys } from '../constants';
import { CreateComplaintInput } from '../types';

export const useCreateComplaint = () => useMutation({ mutationFn: (input: CreateComplaintInput) => complaintApi.create(input) });

export const useAdminComplaints = (params: AdminComplaintParams) =>
  useQuery({ queryKey: complaintKeys.admin(params), queryFn: () => complaintApi.adminList(params), placeholderData: keepPreviousData });

export function useResolveComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; status: 'RESOLVED' | 'DISMISSED'; note: string; takeDown?: boolean }) =>
      complaintApi.resolve(v.id, { status: v.status, note: v.note, takeDown: v.takeDown }),
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: complaintKeys.all }), qc.invalidateQueries({ queryKey: ['products'] })]),
  });
}
