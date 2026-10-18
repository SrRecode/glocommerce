export type ProductStatus = 'draft' | 'active' | 'archived'

export const PRODUCT_SORTS = [
  'newest',
  'price-asc',
  'price-desc',
  'name-asc',
  'rating',
] as const

export type ProductSort = (typeof PRODUCT_SORTS)[number]

export const PRODUCT_SORT_LABELS: Record<ProductSort, string> = {
  newest: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  'name-asc': 'Name: A–Z',
  rating: 'Top rated',
}

export interface PublicCategory {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  productCount?: number
  createdAt: string
}

export interface PublicProductImage {
  url: string
  alt: string
}

export interface PublicProductCategoryRef {
  id: string
  name: string
  slug: string
}

export interface PublicProduct {
  id: string
  name: string
  slug: string
  description: string
  brand: string | null
  price: number
  compareAtPrice: number | null
  currency: string
  category: PublicProductCategoryRef | null
  images: PublicProductImage[]
  stock: number
  status: ProductStatus
  rating: number
  reviewCount: number
  isFeatured: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
}

/** Query params accepted by `GET /products`. Empty values are dropped before send. */
export interface ProductListParams {
  q?: string
  category?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
  sort?: ProductSort
  featured?: boolean
  page?: number
  limit?: number
}
