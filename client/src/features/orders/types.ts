export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

export type OrderPaymentMethod = 'cod'

export type OrderSort = 'newest' | 'oldest' | 'total-asc' | 'total-desc'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export interface OrderCustomer {
  name: string
  email: string | null
  phone: string
}

export interface OrderAddress {
  line1: string
  line2: string | null
  city: string
  state: string | null
  postalCode: string | null
  country: string
}

export interface OrderItem {
  productId: string | null
  name: string
  slug: string
  image: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface OrderStatusEntry {
  status: OrderStatus
  at: string
  note: string | null
}

export interface PublicOrder {
  id: string
  orderNumber: string
  userId: string | null
  customer: OrderCustomer
  shippingAddress: OrderAddress
  items: OrderItem[]
  subtotal: number
  shippingFee: number
  total: number
  currency: string
  paymentMethod: OrderPaymentMethod
  status: OrderStatus
  statusHistory: OrderStatusEntry[]
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface CheckoutItemInput {
  productId: string
  quantity: number
}

export interface CreateOrderPayload {
  items: CheckoutItemInput[]
  customer: {
    name: string
    email?: string
    phone: string
  }
  shippingAddress: {
    line1: string
    line2?: string
    city: string
    state?: string
    postalCode?: string
    country?: string
  }
  note?: string
}

export interface OrderLookupPayload {
  orderNumber: string
  phone: string
}

export interface OrderListParams {
  q?: string
  status?: OrderStatus
  from?: string
  to?: string
  sort?: OrderSort
  page?: number
  limit?: number
}
