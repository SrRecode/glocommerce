export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export function isProductStatus(value: unknown): value is ProductStatus {
  return (
    typeof value === "string" && (PRODUCT_STATUSES as readonly string[]).includes(value)
  );
}

export const PRODUCT_SORTS = [
  "newest",
  "price-asc",
  "price-desc",
  "name-asc",
  "rating",
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount?: number;
  createdAt: string;
}

export interface PublicProductImage {
  url: string;
  alt: string;
}

export interface PublicProductCategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  category: PublicProductCategoryRef | null;
  images: PublicProductImage[];
  stock: number;
  status: ProductStatus;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}
