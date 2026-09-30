import type { Category } from '@/features/categories/types';

export type DeliveryType = 'INSTANT' | 'MANUAL' | 'API';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ProductVariant {
  id: string;
  productId: string;
  title: string;
  denomination: string;
  price: number;
  originalPrice: number | null;
  stockCount: number;
  availableStock: number;
}

export interface StoreSummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl: string;
  coverUrl: string;
  isActive: boolean;
  createdAt?: string;
  stats?: { totalSales: number; avgRating: number | null; reviewCount: number };
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDesc?: string | null;
  categoryId: string;
  category?: Pick<Category, 'id' | 'name' | 'slug'> & Partial<Category>;
  imageUrl: string;
  bannerUrl?: string | null;
  galleryUrls: string[];
  brand: string;
  region: string;
  instantDelivery: boolean;
  deliveryType: DeliveryType;
  deliveryDeadlineHours: number;
  deliveryInstructions?: string | null;
  isFeatured: boolean;
  isPopular: boolean;
  isMarketplace: boolean;
  isActive: boolean;
  approvalStatus: ApprovalStatus;
  rejectedReason?: string | null;
  sellerId: string | null;
  seller?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    role?: string;
    email?: string;
    store?: { name: string; slug: string } | null;
  } | null;
  store?: StoreSummary | null;
  slaDeliverySeconds: number;
  avgRating: number | null;
  reviewCount: number;
  totalStock: number;
  variants: ProductVariant[];
  createdAt: string;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  region?: string;
  brand?: string;
  featured?: boolean;
  popular?: boolean;
  isMarketplace?: boolean;
  delivery?: 'INSTANT' | 'MANUAL';
  minPrice?: number;
  maxPrice?: number;
  sort?: 'popular' | 'newest';
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string | null };
  sellerReply?: string | null;
  sellerRepliedAt?: string | null;
}

/** Yönetim: yorum denetimi listesi */
export interface AdminReview extends Omit<Review, 'user'> {
  user: { id: string; name: string; email: string };
  product: { id: string; slug: string; title: string; seller: { id: string; name: string } | null };
}

export interface SellerListing {
  id: string;
  title: string;
  slug: string;
  description: string;
  imageUrl: string;
  brand: string;
  region: string;
  deliveryType: DeliveryType;
  deliveryDeadlineHours: number;
  approvalStatus: ApprovalStatus;
  rejectedReason?: string | null;
  isActive: boolean;
  /** false: satıcı ilanı geçici olarak yayından kaldırdı (stok korunur) */
  isListed: boolean;
  galleryUrls: string[];
  createdAt: string;
  category?: { id: string; name: string; slug: string };
  variants: {
    id: string;
    title: string;
    denomination: string;
    price: number;
    originalPrice: number | null;
    availableStock: number;
    soldCount: number;
    revenue: number;
  }[];
  totalAvailable: number;
  totalSold: number;
  totalRevenue: number;
}

/** Düzenleme formu için ilanın mevcut değerleri */
export interface EditableListing {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  brand: string;
  region: string;
  imageUrl: string;
  galleryUrls: string[];
  deliveryType: DeliveryType;
  deliveryDeadlineHours: number;
  deliveryInstructions: string | null;
  approvalStatus: ApprovalStatus;
  isActive: boolean;
  isListed: boolean;
  price: number;
  originalPrice: number | null;
}

export interface UpdateListingInput {
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

export interface CreateListingInput {
  title: string;
  description: string;
  categoryId: string;
  price: number;
  originalPrice?: number;
  brand?: string;
  region?: string;
  imageUrl?: string;
  galleryUrls?: string[];
  deliveryType: 'INSTANT' | 'MANUAL';
  deliveryDeadlineHours?: number;
  deliveryInstructions?: string;
  stockCount?: number;
  codes?: string[];
}
