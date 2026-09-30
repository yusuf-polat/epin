export interface CreateReviewDTO {
  rating: number;
  comment: string;
}

export interface AdminReviewListQuery {
  page: number;
  limit: number;
  rating?: number;
  search?: string;
}
