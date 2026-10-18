import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Package, ShoppingBag, Tags } from 'lucide-react'

import { Badge } from '@/components/Badge'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/Skeleton'
import { useAdminCategories, useAdminOrders, useAdminProducts } from '@/features/admin/queries'
import { ORDER_STATUS_TONES } from '@/features/orders/status-tones'
import { ORDER_STATUS_LABELS } from '@/features/orders/types'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

interface KpiCardProps {
  label: string
  value: number | undefined
  hint: string
  icon: ReactNode
  to: string
}

function KpiCard({ label, value, hint, icon, to }: KpiCardProps) {
  return (
    <Link
      to={to}
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 transition-colors duration-120 hover:border-brand/40 hover:bg-surface-sunken"
    >
      <span className="flex size-9 items-center justify-center rounded-md bg-brand-soft text-brand">
        {icon}
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-caption font-medium uppercase tracking-[0.08em] text-muted">
          {label}
        </span>
        <span className="tabular-nums font-display text-h2 text-ink">
          {value === undefined ? '--' : value}
        </span>
      </span>
      <span className="text-body-sm text-graphite">{hint}</span>
    </Link>
  )
}

export function AdminOverviewPage() {
  const ordersQuery = useAdminOrders({ limit: 8, sort: 'newest' })
  const productsQuery = useAdminProducts({ limit: 1 })
  const categoriesQuery = useAdminCategories()

  const orders = ordersQuery.data?.items ?? []

  return (
    <div className="mx-auto w-full max-w-storefront px-6 py-10 lg:px-10">
      <div className="flex flex-col gap-3">
        <span className="text-caption font-medium uppercase tracking-[0.08em] text-muted">
          Admin
        </span>
        <h1 className="font-display text-h1 tracking-[-0.02em] text-ink">Overview</h1>
        <p className="max-w-[62ch] text-body text-graphite">
          A quick read on orders, the catalogue, and how everything is grouped.
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Orders"
          value={ordersQuery.data?.total}
          hint="Every order placed"
          icon={<ShoppingBag size={18} strokeWidth={1.5} aria-hidden="true" />}
          to="/admin/orders"
        />
        <KpiCard
          label="Products"
          value={productsQuery.data?.total}
          hint="Across every status"
          icon={<Package size={18} strokeWidth={1.5} aria-hidden="true" />}
          to="/admin/products"
        />
        <KpiCard
          label="Categories"
          value={categoriesQuery.data?.total}
          hint="Catalogue groupings"
          icon={<Tags size={18} strokeWidth={1.5} aria-hidden="true" />}
          to="/admin/categories"
        />
      </div>

      <section className="mt-14 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-h3 text-ink">Recent orders</h2>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1 text-body-sm font-semibold text-brand transition-colors duration-120 hover:text-brand-hover"
          >
            View all
            <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </div>

        {ordersQuery.isPending ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : null}

        {ordersQuery.isError ? (
          <EmptyState
            title="We could not load recent orders"
            description="Something went wrong on our side. Please refresh and try again."
          />
        ) : null}

        {ordersQuery.isSuccess && orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="Orders placed in the storefront appear here as soon as checkout completes."
          />
        ) : null}

        {ordersQuery.isSuccess && orders.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  to={`/admin/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition-colors duration-120 hover:bg-surface-sunken"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-body font-medium text-ink">{order.orderNumber}</span>
                    <span className="text-body-sm text-muted">
                      {order.customer.name} - {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge tone={ORDER_STATUS_TONES[order.status]}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                    <span className="tabular-nums text-body font-semibold text-ink">
                      {formatMoney(order.total, order.currency)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
