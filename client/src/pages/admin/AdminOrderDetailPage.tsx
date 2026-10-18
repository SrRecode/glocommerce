import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Package } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { ButtonLink } from '@/components/ButtonLink'
import { EmptyState } from '@/components/EmptyState'
import { OrderSummary } from '@/components/OrderSummary'
import { Skeleton } from '@/components/Skeleton'
import { useAdminOrder, useUpdateAdminOrderStatus } from '@/features/admin/queries'
import { ORDER_STATUS_TONES } from '@/features/orders/status-tones'
import { nextStatuses } from '@/features/orders/transitions'
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/features/orders/types'
import { ApiError } from '@/lib/api-client'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

interface PanelProps {
  title: string
  children: ReactNode
}

function Panel({ title, children }: PanelProps) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <h2 className="font-display text-h4 text-ink">{title}</h2>
      {children}
    </section>
  )
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-body-sm text-muted">{label}</span>
      <span className="text-right text-body-sm font-medium text-ink">{value}</span>
    </div>
  )
}

export function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id ?? ''
  const orderQuery = useAdminOrder(id)
  const statusMutation = useUpdateAdminOrderStatus()
  const [statusError, setStatusError] = useState<string | null>(null)

  const handleStatusChange = (status: OrderStatus) => {
    setStatusError(null)
    statusMutation.mutate(
      { id, status },
      {
        onError: (error) => {
          setStatusError(
            error instanceof ApiError ? error.message : 'Could not update the order status',
          )
        },
      },
    )
  }

  const order = orderQuery.data

  if (orderQuery.isPending) {
    return (
      <div className="mx-auto w-full max-w-storefront px-6 py-10 lg:px-10">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-10 w-64" />
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (orderQuery.isError || !order) {
    return (
      <div className="mx-auto w-full max-w-storefront px-6 py-10 lg:px-10">
        <EmptyState
          icon={<Package className="size-7" strokeWidth={1.5} />}
          title="We could not load this order"
          description="The order may have been removed, or the link is no longer valid."
          action={
            <ButtonLink to="/admin/orders" variant="secondary">
              Back to orders
            </ButtonLink>
          }
        />
      </div>
    )
  }

  const addressLines = [
    order.shippingAddress.line1,
    order.shippingAddress.line2,
    [order.shippingAddress.city, order.shippingAddress.state]
      .filter((part): part is string => Boolean(part))
      .join(', '),
    order.shippingAddress.postalCode,
    order.shippingAddress.country,
  ].filter((line): line is string => Boolean(line))

  const transitions = nextStatuses(order.status)

  return (
    <div className="mx-auto w-full max-w-storefront px-6 py-10 lg:px-10">
      <Link
        className="text-body-sm font-semibold text-brand transition-colors duration-120 hover:text-brand-hover"
        to="/admin/orders"
      >
        Back to orders
      </Link>

      <header className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-h2 text-ink">{order.orderNumber}</h1>
          <Badge tone={ORDER_STATUS_TONES[order.status]}>
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </div>
        <p className="text-body-sm text-graphite">
          Placed {formatDate(order.createdAt)} - {formatMoney(order.total, order.currency)}
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <OrderSummary order={order} />

          <Panel title="Status history">
            {order.statusHistory.length === 0 ? (
              <p className="text-body-sm text-graphite">No status changes recorded yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {order.statusHistory.map((entry, index) => (
                  <li
                    key={`${entry.status}-${index}`}
                    className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone={ORDER_STATUS_TONES[entry.status]}>
                        {ORDER_STATUS_LABELS[entry.status]}
                      </Badge>
                      <span className="text-body-sm text-muted">{formatDate(entry.at)}</span>
                    </div>
                    {entry.note ? (
                      <p className="text-body-sm text-graphite">{entry.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Customer">
            <div className="flex flex-col gap-3">
              <DetailRow label="Name" value={order.customer.name} />
              <DetailRow label="Phone" value={order.customer.phone} />
              <DetailRow label="Email" value={order.customer.email ?? '-'} />
            </div>
          </Panel>

          <Panel title="Shipping address">
            <address className="flex flex-col gap-1 not-italic text-body-sm text-graphite">
              {addressLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </address>
          </Panel>

          <Panel title="Payment">
            <div className="flex flex-col gap-3">
              <DetailRow label="Method" value={order.paymentMethod.toUpperCase()} />
              <DetailRow label="Subtotal" value={formatMoney(order.subtotal, order.currency)} />
              <DetailRow label="Shipping" value={formatMoney(order.shippingFee, order.currency)} />
              <DetailRow label="Total" value={formatMoney(order.total, order.currency)} />
            </div>
            {order.note ? (
              <p className="text-body-sm text-graphite">Note: {order.note}</p>
            ) : null}
          </Panel>

          <Panel title="Update status">
            {transitions.length === 0 ? (
              <p className="text-body-sm text-graphite">
                This order is {ORDER_STATUS_LABELS[order.status].toLowerCase()} and cannot move
                further.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {statusError ? (
                  <p
                    role="alert"
                    className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-body-sm text-danger"
                  >
                    {statusError}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  {transitions.map((status) => (
                    <Button
                      key={status}
                      variant="primary"
                      size="sm"
                      disabled={statusMutation.isPending}
                      onClick={() => handleStatusChange(status)}
                    >
                      {statusMutation.isPending && statusMutation.variables?.status === status
                        ? 'Updating...'
                        : `Mark as ${ORDER_STATUS_LABELS[status].toLowerCase()}`}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
