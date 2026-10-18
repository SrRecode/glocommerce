import { type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Search, ShoppingBag } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { Pagination } from '@/components/Pagination'
import { Skeleton } from '@/components/Skeleton'
import { useAdminOrders } from '@/features/admin/queries'
import { ORDER_STATUS_TONES } from '@/features/orders/status-tones'
import {
  ORDER_STATUS_LABELS,
  type OrderListParams,
  type OrderSort,
  type OrderStatus,
} from '@/features/orders/types'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

const PAGE_SIZE = 20
const DEFAULT_SORT: OrderSort = 'newest'

const SORT_LABELS: Record<OrderSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  'total-asc': 'Total: low to high',
  'total-desc': 'Total: high to low',
}

const SORT_OPTIONS = Object.keys(SORT_LABELS) as OrderSort[]
const STATUS_OPTIONS = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]

const SELECT_CLASSES =
  'h-11 rounded-md border border-line bg-surface px-3 text-body-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'

const LABEL_CLASSES = 'text-caption font-medium uppercase tracking-[0.08em] text-muted'

function toSort(value: string | null): OrderSort {
  return value !== null && value in SORT_LABELS ? (value as OrderSort) : DEFAULT_SORT
}

function toStatus(value: string | null): OrderStatus | undefined {
  return value !== null && value in ORDER_STATUS_LABELS ? (value as OrderStatus) : undefined
}

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function readParams(searchParams: URLSearchParams): OrderListParams {
  const q = searchParams.get('q')?.trim() ?? ''
  return {
    q: q || undefined,
    status: toStatus(searchParams.get('status')),
    sort: toSort(searchParams.get('sort')),
    page: toPositiveInt(searchParams.get('page'), 1),
    limit: PAGE_SIZE,
  }
}

export function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = readParams(searchParams)
  const ordersQuery = useAdminOrders(params)

  function updateParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
    }
    setSearchParams(next)
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = new FormData(event.currentTarget).get('q')
    updateParams({ q: typeof value === 'string' ? value.trim() || null : null, page: null })
  }

  function handlePage(page: number) {
    updateParams({ page: page <= 1 ? null : String(page) })
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams())
  }

  const orders = ordersQuery.data?.items ?? []
  const total = ordersQuery.data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="mx-auto w-full max-w-storefront px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-2">
        <p className="text-caption font-semibold uppercase tracking-[0.08em] text-brand">Admin</p>
        <h1 className="font-display text-h2 text-ink">Orders</h1>
        <p className="max-w-2xl text-body-sm text-graphite">
          Review incoming orders, then open one to update its status.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <form className="flex flex-1 items-end gap-3" onSubmit={handleSearch}>
          <label className="flex flex-1 flex-col gap-2">
            <span className={LABEL_CLASSES}>Search</span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                key={params.q ?? ''}
                className="h-11 w-full rounded-md border border-line bg-surface pl-10 pr-3 text-body-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                type="search"
                name="q"
                defaultValue={params.q ?? ''}
                placeholder="Order number, name, or phone"
              />
            </span>
          </label>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <div className="flex flex-col gap-4 sm:flex-row">
          <label className="flex flex-col gap-2">
            <span className={LABEL_CLASSES}>Status</span>
            <select
              className={SELECT_CLASSES}
              value={params.status ?? ''}
              onChange={(event) => updateParams({ status: event.target.value || null, page: null })}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className={LABEL_CLASSES}>Sort</span>
            <select
              className={SELECT_CLASSES}
              value={params.sort ?? DEFAULT_SORT}
              onChange={(event) =>
                updateParams({
                  sort: event.target.value === DEFAULT_SORT ? null : event.target.value,
                  page: null,
                })
              }
            >
              {SORT_OPTIONS.map((sort) => (
                <option key={sort} value={sort}>
                  {SORT_LABELS[sort]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-10">
        {ordersQuery.isPending ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : ordersQuery.isError ? (
          <EmptyState
            icon={<ShoppingBag className="size-7" strokeWidth={1.5} />}
            title="We could not load orders"
            description="Refresh the page or try again in a moment."
          />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="size-7" strokeWidth={1.5} />}
            title="No orders found"
            description="Orders that match your filters will appear here."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    className="flex flex-col gap-3 px-5 py-4 transition-colors duration-120 hover:bg-surface-sunken sm:flex-row sm:items-center sm:justify-between"
                    to={`/admin/orders/${order.id}`}
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="font-semibold text-ink">{order.orderNumber}</span>
                      <span className="truncate text-body-sm text-graphite">
                        {order.customer.name} - {formatDate(order.createdAt)}
                      </span>
                    </span>
                    <span className="flex items-center gap-4">
                      <Badge tone={ORDER_STATUS_TONES[order.status]}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                      <span className="tabular-nums text-body-sm font-semibold text-ink">
                        {formatMoney(order.total, order.currency)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Pagination
                page={params.page ?? 1}
                totalPages={totalPages}
                onChange={handlePage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
