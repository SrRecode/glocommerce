import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'

import { Button } from '@/components/Button'
import { ButtonLink } from '@/components/ButtonLink'
import { EmptyState } from '@/components/EmptyState'
import { Price } from '@/components/Price'
import { TextField } from '@/components/TextField'
import { selectCurrency, selectSubtotal, useCartStore } from '@/features/cart/cart-store'
import { createOrder } from '@/features/orders/api'
import type { CreateOrderPayload } from '@/features/orders/types'
import { ApiError } from '@/lib/api-client'
import { formatMoney } from '@/lib/money'

const PHONE_PATTERN = /^[+]?[\d\s()-]{7,20}$/

const checkoutFormSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2, 'Enter your full name').max(120),
    email: z.union([z.literal(''), z.email('Enter a valid email')]),
    phone: z.string().trim().regex(PHONE_PATTERN, 'Enter a valid phone number'),
  }),
  shippingAddress: z.object({
    line1: z.string().trim().min(3, 'Enter your street address').max(160),
    line2: z.string().trim().max(160),
    city: z.string().trim().min(2, 'Enter your city').max(80),
    state: z.string().trim().max(80),
    postalCode: z.string().trim().max(20),
    country: z.string().trim().min(2, 'Enter your country').max(80),
  }),
  note: z.string().trim().max(500),
})

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>

const DEFAULT_VALUES: CheckoutFormValues = {
  customer: { name: '', email: '', phone: '' },
  shippingAddress: {
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Pakistan',
  },
  note: '',
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const items = useCartStore((state) => state.items)
  const clear = useCartStore((state) => state.clear)
  const subtotal = useCartStore(selectSubtotal)
  const currency = useCartStore(selectCurrency)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-storefront px-6 py-16 lg:px-10 lg:py-24">
        <EmptyState
          title="Your cart is empty"
          description="Add a few pieces before checking out."
          action={<ButtonLink to="/products">Browse the catalogue</ButtonLink>}
        />
      </div>
    )
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)

    const payload: CreateOrderPayload = {
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      customer: {
        name: values.customer.name,
        phone: values.customer.phone,
        ...(values.customer.email ? { email: values.customer.email } : {}),
      },
      shippingAddress: {
        line1: values.shippingAddress.line1,
        city: values.shippingAddress.city,
        country: values.shippingAddress.country,
        ...(values.shippingAddress.line2 ? { line2: values.shippingAddress.line2 } : {}),
        ...(values.shippingAddress.state ? { state: values.shippingAddress.state } : {}),
        ...(values.shippingAddress.postalCode
          ? { postalCode: values.shippingAddress.postalCode }
          : {}),
      },
      ...(values.note ? { note: values.note } : {}),
    }

    try {
      const order = await createOrder(payload)
      clear()
      navigate(`/orders/${order.orderNumber}`, { state: { order } })
    } catch (error) {
      // Stock failures arrive keyed to a non-form field ("items"), so they must not be
      // routed through setError — that would register on a field nobody renders and the
      // shopper would see nothing.
      if (error instanceof ApiError && error.code === 'INSUFFICIENT_STOCK') {
        const detail = error.fieldErrors?.items?.[0]
        setFormError(
          detail
            ? `${detail}. Please update your cart and try again.`
            : 'Some pieces are no longer available in the quantity you chose. Please review your cart and try again.',
        )
        return
      }

      if (error instanceof ApiError && error.fieldErrors) {
        const fieldPaths = new Set<string>([
          'customer.name',
          'customer.email',
          'customer.phone',
          'shippingAddress.line1',
          'shippingAddress.line2',
          'shippingAddress.city',
          'shippingAddress.state',
          'shippingAddress.postalCode',
          'shippingAddress.country',
          'note',
        ])

        let applied = false
        for (const [key, messages] of Object.entries(error.fieldErrors)) {
          const message = messages[0]
          if (!message || !fieldPaths.has(key)) {
            continue
          }
          setError(key as Path<CheckoutFormValues>, { type: 'server', message })
          applied = true
        }

        if (applied) {
          return
        }
      }

      setFormError(
        error instanceof ApiError
          ? error.message
          : 'We could not place your order. Please try again.',
      )
    }
  })

  return (
    <div className="mx-auto w-full max-w-storefront px-6 py-16 lg:px-10 lg:py-24">
      <header className="max-w-[62ch]">
        <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted">Checkout</p>
        <h1 className="mt-3 font-display text-h1 tracking-[-0.02em] text-ink">Cash on delivery</h1>
        <p className="mt-4 text-body text-graphite">
          Tell us where to deliver. You pay the courier in cash when the order arrives.
        </p>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-10 lg:col-span-7">
          <section className="flex flex-col gap-5">
            <h2 className="font-display text-h4 text-ink">Contact</h2>
            <TextField
              label="Full name"
              autoComplete="name"
              error={errors.customer?.name?.message}
              {...register('customer.name')}
            />
            <TextField
              label="Phone number"
              type="tel"
              autoComplete="tel"
              hint="We share this with the courier."
              error={errors.customer?.phone?.message}
              {...register('customer.phone')}
            />
            <TextField
              label="Email (optional)"
              type="email"
              autoComplete="email"
              error={errors.customer?.email?.message}
              {...register('customer.email')}
            />
          </section>

          <section className="flex flex-col gap-5">
            <h2 className="font-display text-h4 text-ink">Delivery address</h2>
            <TextField
              label="Street address"
              autoComplete="address-line1"
              error={errors.shippingAddress?.line1?.message}
              {...register('shippingAddress.line1')}
            />
            <TextField
              label="Apartment, suite, etc. (optional)"
              autoComplete="address-line2"
              error={errors.shippingAddress?.line2?.message}
              {...register('shippingAddress.line2')}
            />
            <TextField
              label="City"
              autoComplete="address-level2"
              error={errors.shippingAddress?.city?.message}
              {...register('shippingAddress.city')}
            />
            <TextField
              label="State or province (optional)"
              autoComplete="address-level1"
              error={errors.shippingAddress?.state?.message}
              {...register('shippingAddress.state')}
            />
            <TextField
              label="Postal code (optional)"
              autoComplete="postal-code"
              error={errors.shippingAddress?.postalCode?.message}
              {...register('shippingAddress.postalCode')}
            />
            <TextField
              label="Country"
              autoComplete="country-name"
              error={errors.shippingAddress?.country?.message}
              {...register('shippingAddress.country')}
            />
          </section>

          <section className="flex flex-col gap-3">
            <label htmlFor="order-note" className="text-body-sm font-medium text-graphite">
              Delivery note (optional)
            </label>
            <textarea
              id="order-note"
              rows={3}
              placeholder="Gate code, preferred time, landmark"
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-body text-ink transition-colors duration-120 placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              {...register('note')}
            />
          </section>

          {formError ? (
            <p
              role="alert"
              className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-body-sm text-danger"
            >
              {formError}
            </p>
          ) : null}

          <div className="flex flex-col gap-3">
            <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? 'Placing order' : 'Place order'}
            </Button>
            <p className="text-caption text-muted">
              By placing this order you agree to pay the full amount on delivery.
            </p>
          </div>
        </form>

        <aside className="lg:col-span-5">
          <div className="rounded-lg border border-line bg-surface p-6">
            <h2 className="font-display text-h4 text-ink">Order summary</h2>
            <ul className="mt-6 flex flex-col divide-y divide-line">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="flex items-start justify-between gap-4 py-3 first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-medium text-ink">{item.name}</p>
                    <p className="mt-1 text-caption text-muted">Qty {item.quantity}</p>
                  </div>
                  <span className="shrink-0 tabular-nums text-body-sm text-ink">
                    {formatMoney(item.unitPrice * item.quantity, item.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-6 flex flex-col gap-3 border-t border-line pt-6 text-body-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-graphite">Subtotal</dt>
                <dd className="tabular-nums text-ink">{formatMoney(subtotal, currency)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-graphite">Shipping</dt>
                <dd className="text-muted">Added at confirmation</dd>
              </div>
            </dl>
            <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-6">
              <span className="text-body-sm font-medium text-ink">Total due on delivery</span>
              <Price amount={subtotal} currency={currency} size="md" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
