import { apiRequest, type Paginated } from '@/lib/api-client'
import { buildQueryString } from '@/lib/utils'
import type {
  CreateOrderPayload,
  OrderListParams,
  OrderLookupPayload,
  PublicOrder,
} from '@/features/orders/types'

/** Map UI params to the query string `GET /orders/mine` expects, dropping empty values. */
function toOrderQuery(params: OrderListParams): string {
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

export async function createOrder(payload: CreateOrderPayload): Promise<PublicOrder> {
  const { order } = await apiRequest<{ order: PublicOrder }>('/orders', {
    method: 'POST',
    body: payload,
  })
  return order
}

export async function lookupOrder(payload: OrderLookupPayload): Promise<PublicOrder> {
  const { order } = await apiRequest<{ order: PublicOrder }>('/orders/lookup', {
    method: 'POST',
    body: payload,
  })
  return order
}

export function listMyOrders(params: OrderListParams = {}): Promise<Paginated<PublicOrder>> {
  return apiRequest<Paginated<PublicOrder>>(`/orders/mine${toOrderQuery(params)}`)
}

export async function getMyOrder(orderNumber: string): Promise<PublicOrder> {
  const { order } = await apiRequest<{ order: PublicOrder }>(
    `/orders/mine/${encodeURIComponent(orderNumber)}`,
  )
  return order
}
