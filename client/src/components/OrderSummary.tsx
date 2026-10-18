import { ImageOff } from 'lucide-react'

import { Badge } from '@/components/Badge'
import { Price } from '@/components/Price'
import { ORDER_STATUS_TONES } from '@/features/orders/status-tones'
import { ORDER_STATUS_LABELS, type PublicOrder } from '@/features/orders/types'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

export interface OrderSummaryProps {
  order: PublicOrder
  className?: string
}

export function OrderSummary({ order, className }: OrderSummaryProps) {
  const addressLine = [order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode]
    .filter(Boolean)
    .join(', ')

  return (
    <section className={cn('overflow-hidden rounded-xl border border-line bg-surface', className)}>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-body font-semibold tracking-[-0.01em] text-ink">{order.orderNumber}</span>
            <Badge tone={ORDER_STATUS_TONES[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
          </div>
          <p className="text-caption text-muted">Placed {formatDate(order.createdAt)}</p>
        </div>
        <Price amount={order.total} currency={order.currency} size="md" />
      </header>

      <ul className="divide-y divide-line">
        {order.items.map((item) => (
          <li key={item.productId ?? item.slug} className="flex items-center gap-4 px-6 py-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-line bg-surface-sunken">
              {item.image ? (
                <img src={item.image} alt={item.name} className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-muted">
                  <ImageOff size={20} strokeWidth={1.5} aria-hidden="true" />
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body font-medium text-ink">{item.name}</span>
              <span className="text-body-sm text-muted">
                {item.quantity} x {formatMoney(item.unitPrice, order.currency)}
              </span>
            </div>
            <span className="shrink-0 tabular-nums text-body font-semibold text-ink">
              {formatMoney(item.lineTotal, order.currency)}
            </span>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 border-t border-line px-6 py-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-caption font-medium uppercase tracking-[0.08em] text-muted">Contact</h3>
          <p className="text-body-sm text-ink">{order.customer.name}</p>
          {order.customer.email ? <p className="text-body-sm text-graphite">{order.customer.email}</p> : null}
          <p className="text-body-sm text-graphite">{order.customer.phone}</p>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-caption font-medium uppercase tracking-[0.08em] text-muted">Shipping address</h3>
          <p className="text-body-sm text-ink">{order.shippingAddress.line1}</p>
          {order.shippingAddress.line2 ? (
            <p className="text-body-sm text-graphite">{order.shippingAddress.line2}</p>
          ) : null}
          {addressLine ? <p className="text-body-sm text-graphite">{addressLine}</p> : null}
          <p className="text-body-sm text-graphite">{order.shippingAddress.country}</p>
        </div>
      </div>

      {order.statusHistory.length > 0 ? (
        <div className="border-t border-line px-6 py-5">
          <h3 className="text-caption font-medium uppercase tracking-[0.08em] text-muted">History</h3>
          <ol className="mt-3 flex flex-col gap-3">
            {order.statusHistory.map((entry, index) => (
              <li key={`${entry.status}-${index}`} className="flex items-start gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-pill bg-brand" aria-hidden="true" />
                <div className="flex flex-col">
                  <span className="text-body-sm font-medium text-ink">{ORDER_STATUS_LABELS[entry.status]}</span>
                  <span className="text-caption text-muted">
                    {formatDate(entry.at)}
                    {entry.note ? ` - ${entry.note}` : ''}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <dl className="flex flex-col gap-2 border-t border-line bg-surface-sunken px-6 py-5">
        <div className="flex items-center justify-between text-body-sm text-graphite">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatMoney(order.subtotal, order.currency)}</dd>
        </div>
        <div className="flex items-center justify-between text-body-sm text-graphite">
          <dt>Shipping</dt>
          <dd className="tabular-nums">
            {order.shippingFee > 0 ? formatMoney(order.shippingFee, order.currency) : 'Free'}
          </dd>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-3">
          <dt className="text-body font-semibold text-ink">Total due on delivery</dt>
          <dd>
            <Price amount={order.total} currency={order.currency} size="md" />
          </dd>
        </div>
      </dl>
    </section>
  )
}
