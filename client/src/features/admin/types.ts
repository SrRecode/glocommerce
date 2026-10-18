import type { ProductListParams, ProductStatus, PublicProductImage } from '@/features/catalog/types'

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
}

/** Admin product listing adds a status filter on top of the storefront params. */
export type AdminProductListParams = ProductListParams & { status?: ProductStatus }

/**
 * Payload for `POST`/`PATCH /admin/products`. The form always submits a complete
 * payload, so the fields the create schema requires stay required here even though
 * the server's update schema is partial. Clearable optionals are sent as `null`.
 */
export interface AdminProductInput {
  name: string
  description: string
  price: number
  brand?: string | null
  compareAtPrice?: number | null
  currency?: string
  category?: string | null
  images?: PublicProductImage[]
  stock?: number
  status?: ProductStatus
  isFeatured?: boolean
  tags?: string[]
}

/** Payload for `POST`/`PATCH /admin/categories`. */
export interface AdminCategoryInput {
  name: string
  description?: string | null
  imageUrl?: string | null
}

/** Response shape of `POST /admin/uploads`. */
export interface StoredImage {
  url: string
  publicId: string | null
}
