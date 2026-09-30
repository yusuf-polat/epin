'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../services/product.api';
import { productKeys } from '../constants';
import { CreateListingInput, UpdateListingInput } from '../types';

// ---------- Yorumlar ----------
export const useProductReviews = (slug: string) => useQuery({ queryKey: productKeys.reviews(slug), queryFn: () => productApi.reviews(slug) });

export function useAddReview(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { rating: number; comment: string }) => productApi.addReview(slug, input),
    onSettled: () => qc.invalidateQueries({ queryKey: productKeys.reviews(slug) }),
  });
}

/** Satıcının yoruma yanıtı (reply: null → yanıtı kaldır) */
export function useReplyReview(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { reviewId: string; reply: string | null }) =>
      v.reply ? productApi.replyReview(slug, v.reviewId, v.reply) : productApi.deleteReply(slug, v.reviewId),
    onSettled: () => qc.invalidateQueries({ queryKey: productKeys.reviews(slug) }),
  });
}

export const useAdminReviews = (params: { page: number; rating?: number; search?: string }) =>
  useQuery({ queryKey: productKeys.adminReviews(params), queryFn: () => productApi.adminReviews(params), placeholderData: keepPreviousData });

export function useAdminDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; reason: string }) => productApi.adminDeleteReview(v.id, v.reason),
    onSettled: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

// ---------- Satıcı ilanları ----------
export const useMyListings = (enabled = true) => useQuery({ queryKey: productKeys.mine, queryFn: productApi.myListings, enabled });

function useListingMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: productKeys.all }) });
}

export const useCreateListing = () => useListingMutation((input: CreateListingInput) => productApi.createListing(input));
export const useListingForEdit = (id: string) => useQuery({ queryKey: productKeys.editable(id), queryFn: () => productApi.listingForEdit(id) });
export const useUpdateListing = () => useListingMutation((v: { id: string; input: UpdateListingInput }) => productApi.updateListing(v.id, v.input));
export const useRemoveListing = () => useListingMutation((id: string) => productApi.removeListing(id));
export const useSetListed = () => useListingMutation((v: { id: string; isListed: boolean }) => productApi.setListed(v.id, v.isListed));
export const useAddCodes = () => useListingMutation((v: { id: string; codes: string[] }) => productApi.addCodes(v.id, v.codes));
export const useSetStock = () => useListingMutation((v: { id: string; stockCount: number }) => productApi.setStock(v.id, v.stockCount));

// ---------- Onay süreci (yönetim) ----------
export interface AdminProductParams {
  page: number;
  limit?: number;
  status?: string;
  search?: string;
}

export const useAdminProducts = (params: AdminProductParams) =>
  useQuery({ queryKey: productKeys.admin(params), queryFn: () => productApi.adminList(params), placeholderData: keepPreviousData });

export const useApproveProduct = () => useListingMutation((id: string) => productApi.approve(id));
export const useRejectProduct = () => useListingMutation((v: { id: string; reason: string }) => productApi.reject(v.id, v.reason));
