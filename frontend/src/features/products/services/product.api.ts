import { apiClient, RequestOptions } from '@/lib/api';
import { AdminReview, ApprovalStatus, CreateListingInput, EditableListing, Product, ProductFilters, Review, SellerListing, UpdateListingInput } from '../types';

export const productApi = {
  list: (filters: ProductFilters = {}, options?: RequestOptions) =>
    apiClient.getPage<Product>('/products', { ...options, params: { ...filters } }),
  getBySlug: (slug: string, options?: RequestOptions) => apiClient.get<Product>(`/products/${encodeURIComponent(slug)}`, options),

  reviews: (slug: string) => apiClient.get<Review[]>(`/products/${encodeURIComponent(slug)}/reviews`),
  addReview: (slug: string, input: { rating: number; comment: string }) =>
    apiClient.post<Review>(`/products/${encodeURIComponent(slug)}/reviews`, input),
  replyReview: (slug: string, reviewId: string, reply: string) =>
    apiClient.put<Review>(`/products/${encodeURIComponent(slug)}/reviews/${reviewId}/reply`, { reply }),
  deleteReply: (slug: string, reviewId: string) => apiClient.delete<Review>(`/products/${encodeURIComponent(slug)}/reviews/${reviewId}/reply`),

  // Yorum denetimi (yönetim)
  adminReviews: (params: { page: number; rating?: number; search?: string }) => apiClient.getPage<AdminReview>('/reviews/admin', { params }),
  adminDeleteReview: (id: string, reason: string) => apiClient.delete<{ deleted: boolean }>(`/reviews/admin/${id}`, { body: { reason } }),

  // Satıcı ilanları
  myListings: () => apiClient.get<SellerListing[]>('/products/mine'),
  createListing: (input: CreateListingInput) => apiClient.post<Product>('/products/listings', input),
  listingForEdit: (id: string) => apiClient.get<EditableListing>(`/products/mine/${id}`),
  updateListing: (id: string, input: UpdateListingInput) =>
    apiClient.put<{ id: string; slug: string; approvalStatus: ApprovalStatus; requiresApproval: boolean }>(`/products/${id}`, input),
  removeListing: (id: string) => apiClient.delete<{ closed: boolean; deleted: boolean }>(`/products/${id}`),
  setListed: (id: string, isListed: boolean) => apiClient.patch<{ isListed: boolean }>(`/products/${id}/visibility`, { isListed }),
  addCodes: (id: string, codes: string[]) =>
    apiClient.post<{ addedCount: number; skippedCount: number }>(`/products/${id}/codes`, { codes }),
  setStock: (id: string, stockCount: number) => apiClient.patch<{ stockCount: number }>(`/products/${id}/stock`, { stockCount }),

  // Onay süreci (yönetim)
  adminList: (params: { page?: number; limit?: number; status?: string; search?: string }) =>
    apiClient.getPage<Product>('/products/admin', { params }),
  approve: (id: string) => apiClient.post<Product>(`/products/admin/${id}/approve`),
  reject: (id: string, reason: string) => apiClient.post<Product>(`/products/admin/${id}/reject`, { reason }),
};
