import { ImageOff, Minus, Plus } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/Button'
import { ButtonLink } from '@/components/ButtonLink'
import { EmptyState } from '@/components/EmptyState'
import { Price } from '@/components/Price'
import {
  clampQuantity,
  selectCurrency,
  selectSubtotal,
  selectTotalItems,
  useCartStore,
} from '@/features/cart/cart-store'
import { formatMoney } from '@/lib/money'

const STEPPER_CLASSES =
  'inline-flex size-9 items-center justify-center rounded-md border border-line bg-surface text-graphite transition-colors duration-120 hover:bg-surface-sunken disabled:pointer-events-none disabled:opacity-40'

export function CartPage() {
  const items = useCartStore((state) => state.items)
  const setQuantity = useCartStore((state) => state.setQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const totalItems = useCartStore(selectTotalItems)
  const subtotal = useCartStore(selectSubtotal)
  const currency = useCartStore(selectCurrency)

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-storefront px-6 py-16 lg:px-10 lg:py-24">
        <EmptyState
          title="Your cart is empty"
          description="Browse the catalogue and add a few considered pieces."
          action={<ButtonLink to="/products">Browse the catalogue</ButtonLink>}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-storefront px-6 py-16 lg:px-10 lg:py-24">
      <header className="max-w-[62ch]">
        <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted">Cart</p>
        <h1 className="mt-3 font-display text-h1 tracking-[-0.02em] text-ink">Your cart</h1>
        <p className="mt-4 text-body text-graphite">
          {totalItems} {totalItems === 1 ? 'item' : 'items'} ready for cash on delivery.
        </p>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
        <ul className="flex flex-col divide-y divide-line lg:col-span-8">
          {items.map((item) => (
            <li key={item.productId} className="flex gap-5 py-6 first:pt-0 last:pb-0">
              <Link
                to={`/products/${item.slug}`}
                className="relative size-24 shrink-0 overflow-hidden rounded-md border border-line bg-surface-sunken"
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-muted">
                    <ImageOff size={20} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      to={`/products/${item.slug}`}
                      className="block truncate font-display text-h4 text-ink transition-colors duration-120 hover:text-brand"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-1 text-body-sm text-muted">
                      {formatMoney(item.unitPrice, item.currency)} each
                    </p>
                  </div>
                  <Price
                    amount={item.unitPrice * item.quantity}
                    currency={item.currency}
                    size="sm"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={STEPPER_CLASSES}
                      onClick={() => setQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label={`Decrease quantity of ${item.name}`}
                    >
                      <Minus size={14} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                    <span
                      aria-live="polite"
                      className="w-10 text-center text-body-sm font-medium tabular-nums text-ink"
                    >
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className={STEPPER_CLASSES}
                      onClick={() => setQuantity(item.productId, item.quantity + 1)}
                      disabled={clampQuantity(item.quantity + 1, item.maxStock) === item.quantity}
                      aria-label={`Increase quantity of ${item.name}`}
                    >
                      <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => removeItem(item.productId)}>
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:col-span-4">
          <div className="rounded-lg border border-line bg-surface p-6">
            <h2 className="font-display text-h4 text-ink">Summary</h2>
            <dl className="mt-6 flex flex-col gap-3 text-body-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-graphite">Subtotal</dt>
                <dd className="tabular-nums text-ink">{formatMoney(subtotal, currency)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-graphite">Shipping</dt>
                <dd className="text-muted">Calculated at checkout</dd>
              </div>
            </dl>
            <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-6">
              <span className="text-body-sm font-medium text-ink">Total</span>
              <Price amount={subtotal} currency={currency} size="md" />
            </div>
            <ButtonLink to="/checkout" size="lg" className="mt-6 w-full">
              Checkout
            </ButtonLink>
            <p className="mt-4 text-caption text-muted">
              Pay in cash when your order arrives. No card required.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
