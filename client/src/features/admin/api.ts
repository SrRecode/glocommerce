import { apiRequest, type Paginated } from '@/lib/api-client'
import { buildQueryString } from '@/lib/utils'
import type { PublicCategory, PublicProduct } from '@/features/catalog/types'
import type { OrderListParams, OrderStatus, PublicOrder } from '@/features/orders/types'
import type {
  AdminCategoryInput,
  AdminProductInput,
  AdminProductListParams,
  StoredImage,
} from '@/features/admin/types'

/** Map UI params to the query string `GET /admin/products` expects, dropping empty values. */
function toAdminProductQuery(params: AdminProductListParams): string {
  return buildQueryString({
    q: params.q?.trim() || undefined,
    category: params.category?.trim() || undefined,
    brand: params.brand?.trim() || undefined,
    status: params.status,
    sort: params.sort,
    featured: params.featured === undefined ? undefined : String(params.featured),
    page: params.page,
    limit: params.limit,
  })
}

/** Map UI params to the query string `GET /admin/orders` expects, dropping empty values. */
function toAdminOrderQuery(params: OrderListParams): string {
  return buildQueryString({
    q: params.q?.trim() || undefined,
    status: params.status,
    from: params.from,
    to: params.to,
    sort: params.sort,
    page: params.page,
    limit: params.limit,
  })
}

export function listAdminProducts(
  params: AdminProductListParams = {},
): Promise<Paginated<PublicProduct>> {
  return apiRequest<Paginated<PublicProduct>>(`/admin/products${toAdminProductQuery(params)}`)
}

export async function getAdminProduct(id: string): Promise<PublicProduct> {
  const { product } = await apiRequest<{ product: PublicProduct }>(
    `/admin/products/${encodeURIComponent(id)}`,
  )
  return product
}

export async function createAdminProduct(input: AdminProductInput): Promise<PublicProduct> {
  const { product } = await apiRequest<{ product: PublicProduct }>('/admin/products', {
    method: 'POST',
    body: input,
  })
  return product
}

export async function updateAdminProduct(
  id: string,
  input: AdminProductInput,
): Promise<PublicProduct> {
  const { product } = await apiRequest<{ product: PublicProduct }>(
    `/admin/products/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: input },
  )
  return product
}

export function deleteAdminProduct(id: string): Promise<void> {
  return apiRequest<void>(`/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function listAdminCategories(): Promise<{ items: PublicCategory[]; total: number }> {
  return apiRequest<{ items: PublicCategory[]; total: number }>('/admin/categories')
}

export async function createAdminCategory(input: AdminCategoryInput): Promise<PublicCategory> {
  const { category } = await apiRequest<{ category: PublicCategory }>('/admin/categories', {
    method: 'POST',
    body: input,
  })
  return category
}

export async function updateAdminCategory(
  id: string,
  input: AdminCategoryInput,
): Promise<PublicCategory> {
  const { category } = await apiRequest<{ category: PublicCategory }>(
    `/admin/categories/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: input },
  )
  return category
}

export function deleteAdminCategory(id: string): Promise<void> {
  return apiRequest<void>(`/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/**
 * Upload an image file to `POST /admin/uploads` and return its stored location.
 * The server accepts a single multipart field named `image`.
 */
export async function uploadProductImage(file: File): Promise<StoredImage> {
  const formData = new FormData()
  formData.append('image', file)
  const { image } = await apiRequest<{ image: StoredImage }>('/admin/uploads', {
    method: 'POST',
    body: formData,
  })
  return image
}

export function listAdminOrders(params: OrderListParams = {}): Promise<Paginated<PublicOrder>> {
  return apiRequest<Paginated<PublicOrder>>(`/admin/orders${toAdminOrderQuery(params)}`)
}

export async function getAdminOrder(id: string): Promise<PublicOrder> {
  const { order } = await apiRequest<{ order: PublicOrder }>(
    `/admin/orders/${encodeURIComponent(id)}`,
  )
  return order
}

export async function updateAdminOrderStatus(id: string, status: OrderStatus): Promise<PublicOrder> {
  const { order } = await apiRequest<{ order: PublicOrder }>(
    `/admin/orders/${encodeURIComponent(id)}/status`,
    { method: 'PATCH', body: { status } },
  )
  return order
}
