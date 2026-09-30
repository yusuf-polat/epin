'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '../services/category.api';
import { categoryKeys } from '../constants';
import { CategoryInput } from '../types';

export const useCategories = () => useQuery({ queryKey: categoryKeys.all, queryFn: () => categoryApi.list(), staleTime: 5 * 60_000 });

function useCategoryMutation<TVars>(fn: (v: TVars) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: categoryKeys.all }) });
}

export const useSaveCategory = () =>
  useCategoryMutation((v: { id?: string; input: CategoryInput }) => (v.id ? categoryApi.update(v.id, v.input) : categoryApi.create(v.input)));
export const useDeleteCategory = () => useCategoryMutation((id: string) => categoryApi.remove(id));
