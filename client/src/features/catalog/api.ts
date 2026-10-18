import { apiRequest, type Paginated } from '@/lib/api-client'
import { buildQueryString } from '@/lib/utils'
import type { PublicCategory, PublicProduct, ProductListParams } from '@/features/catalog/types'

/** Map UI params to the query string `GET /products` expects, dropping empty values. */
function toProductQuery(params: ProductListParams): string {
  return buildQueryString({
    q: params.q?.trim() || undefined,
    category: params.category?.trim() || undefined,
    brand: params.brand?.trim() || undefined,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    sort: params.sort,
    featured: params.featured === undefined ? undefined : String(params.featured),
    page: params.page,
    limit: params.limit,
  })
}

export function listProducts(params: ProductListParams = {}): Promise<Paginated<PublicProduct>> {
  return apiRequest<Paginated<PublicProduct>>(`/products${toProductQuery(params)}`)
}

export async function getProductBySlug(slug: string): Promise<PublicProduct> {
  const { product } = await apiRequest<{ product: PublicProduct }>(
    `/products/${encodeURIComponent(slug)}`,
  )
  return product
}

export async function listCategories(): Promise<PublicCategory[]> {
  const { items } = await apiRequest<{ items: PublicCategory[]; total: number }>('/categories')
  return items
}

export async function getCategoryBySlug(slug: string): Promise<PublicCategory> {
  const { category } = await apiRequest<{ category: PublicCategory }>(
    `/categories/${encodeURIComponent(slug)}`,
  )
  return category
}
