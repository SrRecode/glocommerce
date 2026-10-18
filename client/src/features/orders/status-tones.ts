import type { BadgeTone } from '@/components/Badge'
import type { OrderStatus } from '@/features/orders/types'

export const ORDER_STATUS_TONES: Record<OrderStatus, BadgeTone> = {
  pending: 'warning',
  confirmed: 'brand',
  shipped: 'accent',
  delivered: 'success',
  cancelled: 'danger',
}
