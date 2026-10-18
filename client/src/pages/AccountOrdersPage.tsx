import { useQuery } from '@tanstack/react-query'
import { PackageCheck } from 'lucide-react'
import { Link } from 'react-router'

import { Badge } from '@/components/Badge'
import { ButtonLink } from '@/components/ButtonLink'
import { EmptyState } from '@/components/EmptyState'
import { Spinner } from '@/components/Spinner'
import { useAuth } from '@/features/auth/use-auth'
import { listMyOrders } from '@/features/orders/api'
import { ORDER_STATUS_TONES } from '@/features/orders/status-tones'
import { ORDER_STATUS_LABELS } from '@/features/orders/types'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

export function AccountOrdersPage() {
  const { status } = useAuth()

  const ordersQuery = useQuery({
    queryKey: ['orders', 'mine', 'list'],
    queryFn: () => listMyOrders(),
    enabled: status === 'authenticated',
  })

  if (status === 'loading') {
    return (
      <div className="mx-auto w-full max-w-storefront px-6 py-16 lg:px-10 lg:py-24">
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto w-full max-w-storefront px-6 py-16 lg:px-10 lg:py-24">
        <EmptyState
          icon={<PackageCheck size={28} strokeWidth={1.5} aria-hidden="true" />}
          title="Sign in to view your orders"
          description="Your order history appears here once you are signed in."
          action={<ButtonLink to="/login">Sign in</ButtonLink>}
        />
      </div>
    )
  }

  const orders = ordersQuery.data?.items ?? []

  return (
    <div className="mx-auto w-full max-w-storefront px-6 py-16 lg:px-10 lg:py-24">
      <div className="flex flex-col gap-3">
        <span className="text-caption font-medium uppercase tracking-[0.08em] text-muted">Account</span>
        <h1 className="font-display text-h1 tracking-[-0.02em] text-ink">Your orders</h1>
      </div>

      {ordersQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : ordersQuery.isError ? (
        <EmptyState
          className="mt-10"
          title="We could not load your orders"
          description="Please refresh the page and try again."
        />
      ) : orders.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={<PackageCheck size={28} strokeWidth={1.5} aria-hidden="true" />}
          title="No orders yet"
          description="When you place an order it will appear here."
          action={<ButtonLink to="/products">Browse the catalogue</ButtonLink>}
        />
      ) : (
        <ul className="mt-10 flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                to={`/orders/${order.orderNumber}`}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition-colors duration-120 hover:bg-surface-sunken"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-body font-medium text-ink">{order.orderNumber}</span>
                  <span className="text-body-sm text-muted">
                    {formatDate(order.createdAt)} - {order.items.length}{' '}
                    {order.items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge tone={ORDER_STATUS_TONES[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                  <span className="tabular-nums text-body font-semibold text-ink">
                    {formatMoney(order.total, order.currency)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
