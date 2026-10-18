import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/Button'
import { OrderSummary } from '@/components/OrderSummary'
import { TextField } from '@/components/TextField'
import { lookupOrder } from '@/features/orders/api'
import type { PublicOrder } from '@/features/orders/types'
import { ApiError } from '@/lib/api-client'

const PHONE_PATTERN = /^[+]?[\d\s()-]{7,20}$/

const lookupFormSchema = z.object({
  orderNumber: z.string().trim().min(1, 'Enter your order number'),
  phone: z.string().trim().regex(PHONE_PATTERN, 'Enter a valid phone number'),
})

type LookupFormValues = z.infer<typeof lookupFormSchema>

const DEFAULT_VALUES: LookupFormValues = {
  orderNumber: '',
  phone: '',
}

export function OrderLookupPage() {
  const [order, setOrder] = useState<PublicOrder | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LookupFormValues>({
    resolver: zodResolver(lookupFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const result = await lookupOrder({
        orderNumber: values.orderNumber.trim(),
        phone: values.phone.trim(),
      })
      setOrder(result)
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        let handled = false
        for (const [key, messages] of Object.entries(error.fieldErrors)) {
          const message = messages[0]
          if (!message) continue
          if (key === 'orderNumber' || key === 'phone') {
            setError(key, { type: 'server', message })
            handled = true
          }
        }
        if (handled) return
      }
      setFormError(error instanceof ApiError ? error.message : 'We could not find this order. Please try again.')
    }
  })

  return (
    <div className="mx-auto w-full max-w-storefront px-6 py-16 lg:px-10 lg:py-24">
      <div className="flex flex-col gap-3">
        <span className="text-caption font-medium uppercase tracking-[0.08em] text-muted">Order status</span>
        <h1 className="font-display text-h1 tracking-[-0.02em] text-ink">Track your order</h1>
        <p className="max-w-[60ch] text-body text-graphite">
          Enter your order number and the phone number you used at checkout.
        </p>
      </div>

      <form
        noValidate
        onSubmit={onSubmit}
        className="mt-10 flex max-w-xl flex-col gap-5 rounded-xl border border-line bg-surface p-6"
      >
        <TextField
          label="Order number"
          autoComplete="off"
          placeholder="GC-000000"
          error={errors.orderNumber?.message}
          {...register('orderNumber')}
        />
        <TextField
          label="Phone number"
          type="tel"
          autoComplete="tel"
          placeholder="0300 0000000"
          error={errors.phone?.message}
          {...register('phone')}
        />
        {formError ? (
          <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-body-sm text-danger">
            {formError}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? 'Looking up' : 'Find my order'}
        </Button>
      </form>

      {order ? <OrderSummary order={order} className="mt-10" /> : null}
    </div>
  )
}
