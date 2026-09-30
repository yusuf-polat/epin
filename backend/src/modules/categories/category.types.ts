export interface CreateCategoryDTO {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  imageUrl: string;
  sortOrder?: number;
  commissionRate?: number | null;
}

export type UpdateCategoryDTO = Partial<CreateCategoryDTO>;
