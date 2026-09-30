import { DeliveryType, ProductApprovalStatus } from '@prisma/client';

export type ProductSort = 'popular' | 'newest';

export interface ProductListQuery {
  page: number;
  limit: number;
  category?: string;
  brand?: string;
  region?: string;
  search?: string;
  featured?: boolean;
  popular?: boolean;
  isMarketplace?: boolean;
  delivery?: 'INSTANT' | 'MANUAL';
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
}

export interface AdminProductListQuery {
  page: number;
  limit: number;
  status?: ProductApprovalStatus | 'ALL';
  search?: string;
}

export interface CreateProductDTO {
  title: string;
  slug: string;
  description: string;
  shortDesc?: string;
  categoryId: string;
  imageUrl: string;
  bannerUrl?: string;
  galleryUrls?: string[];
  brand: string;
  region: string;
  deliveryType: DeliveryType;
  deliveryDeadlineHours: number;
  deliveryInstructions?: string;
  isFeatured: boolean;
  isPopular: boolean;
  variants: {
    title: string;
    denomination: string;
    price: number;
    originalPrice?: number;
  }[];
}

export interface UpdateListingDTO {
  title: string;
  description: string;
  categoryId: string;
  price: number;
  originalPrice: number | null;
  brand: string;
  region: string;
  galleryUrls: string[];
  deliveryDeadlineHours?: number;
  deliveryInstructions: string | null;
}

export interface CreateListingDTO {
  title: string;
  description: string;
  categoryId: string;
  price: number;
  originalPrice?: number;
  brand?: string;
  region: string;
  imageUrl?: string;
  galleryUrls?: string[];
  deliveryType: 'INSTANT' | 'MANUAL';
  deliveryDeadlineHours: number;
  deliveryInstructions?: string;
  stockCount: number;
  codes?: string[];
}

export interface AddCodesDTO {
  codes: string[];
  variantId?: string;
}
