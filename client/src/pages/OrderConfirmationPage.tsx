import { useQuery } from '@tanstack/react-query'
import { PackageCheck } from 'lucide-react'
import { useLocation, useParams } from 'react-router'

import { ButtonLink } from '@/components/ButtonLink'
import { EmptyState } from '@/components/EmptyState'
import { OrderSummary } from '@/components/OrderSummary'
import { Spinner } from '@/components/Spinner'
import { useAuth } from '@/features/auth/use-auth'
import { getMyOrder } from '@/features/orders/api'
import type { PublicOrder } from '@/features/orders/types'

interface OrderLocationState {
  order?: PublicOrder
}

export function OrderConfirmationPage() {
  const { orderNumber = '' } = useParams<{ orderNumber: string }>()
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  const stateOrder = (location.state as OrderLocationState | null)?.order ?? null

  const orderQuery = useQuery({
    queryKey: ['orders', 'mine', orderNumber],
    queryFn: () => getMyOrder(orderNumber),
    enabled: !stateOrder && isAuthenticated && Boolean(orderNumber),
  })

  const order = stateOrder ?? orderQuery.data ?? null

  if (order) {
    return (
      <div className="mx-auto w-full max-w-storefront px-6 py-16 lg:px-10 lg:py-24">
        <div className="flex flex-col gap-3">
          <span className="text-caption font-medium uppercase tracking-[0.08em] text-muted">Order</span>
          <h1 className="font-display text-h1 tracking-[-0.02em] text-ink">Thank you for your order</h1>
          <p className="max-w-[60ch] text-body text-graphite">
            We have received order {order.orderNumber}. Pay in cash when it arrives.
          </p>
        </div>
        <OrderSummary order={order} className="mt-10" />
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink to="/products">Continue shopping</ButtonLink>
          <ButtonLink to="/orders/lookup" variant="secondary">
            Track another order
          </ButtonLink>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-storefront px-6 py-16 lg:px-10 lg:py-24">
      {orderQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <EmptyState
          icon={<PackageCheck size={28} strokeWidth={1.5} aria-hidden="true" />}
          title="We could not find this order"
          description="Track your order with your order number and the phone number you used at checkout."
          action={<ButtonLink to="/orders/lookup">Track your order</ButtonLink>}
        />
      )}
    </div>
  )
}
