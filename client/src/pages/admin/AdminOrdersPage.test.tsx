import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAdminOrders } from '@/features/admin/queries'
import type { PublicOrder } from '@/features/orders/types'
import type { Paginated } from '@/lib/api-client'
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage'

vi.mock('@/features/admin/queries', () => ({
  useAdminOrders: vi.fn(),
}))

const mockedUseAdminOrders = vi.mocked(useAdminOrders)

function makeOrder(overrides: Partial<PublicOrder> = {}): PublicOrder {
  return {
    id: 'order-1',
    orderNumber: 'GC-1',
    userId: null,
    customer: {
      name: 'Ayesha Khan',
      email: 'ayesha@example.com',
      phone: '+923001234567',
    },
    shippingAddress: {
      line1: '12 Garden Road',
      line2: null,
      city: 'Lahore',
      state: 'Punjab',
      postalCode: '54000',
      country: 'Pakistan',
    },
    items: [
      {
        productId: 'product-1',
        name: 'Linen Shirt',
        slug: 'linen-shirt',
        image: null,
        unitPrice: 499900,
        quantity: 1,
        lineTotal: 499900,
      },
    ],
    subtotal: 499900,
    shippingFee: 0,
    total: 499900,
    currency: 'PKR',
    paymentMethod: 'cod',
    status: 'pending',
    statusHistory: [{ status: 'pending', at: '2026-01-01T00:00:00.000Z', note: null }],
    note: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function setOrdersQuery(
  value: { isPending?: boolean; isError?: boolean; data?: Paginated<PublicOrder> },
) {
  mockedUseAdminOrders.mockReturnValue({
    isPending: false,
    isError: false,
    ...value,
  } as unknown as ReturnType<typeof useAdminOrders>)
}

function renderOrdersPage() {
  const router = createMemoryRouter(
    [{ path: '/admin/orders', element: <AdminOrdersPage /> }],
    { initialEntries: ['/admin/orders'] },
  )

  render(<RouterProvider router={router} />)
}

describe('AdminOrdersPage', () => {
  beforeEach(() => {
    mockedUseAdminOrders.mockReset()
  })

  it('renders a row for each order with its status, customer, and total', () => {
    setOrdersQuery({
      data: { items: [makeOrder()], page: 1, limit: 20, total: 1 },
    })

    renderOrdersPage()

    const row = screen.getByRole('link', { name: /GC-1/ })
    expect(row).toHaveAttribute('href', '/admin/orders/order-1')
    expect(row).toHaveTextContent('Ayesha Khan')
    expect(row).toHaveTextContent('Pending')
    expect(row).toHaveTextContent('Rs 4,999.00')
  })

  it('links each row to the order detail page', () => {
    setOrdersQuery({
      data: { items: [makeOrder({ id: 'order-9', orderNumber: 'GC-9' })], page: 1, limit: 20, total: 1 },
    })

    renderOrdersPage()

    expect(screen.getByRole('link', { name: /GC-9/ })).toHaveAttribute(
      'href',
      '/admin/orders/order-9',
    )
  })

  it('shows the empty state when there are no orders', () => {
    setOrdersQuery({
      data: { items: [], page: 1, limit: 20, total: 0 },
    })

    renderOrdersPage()

    expect(screen.getByText('No orders found')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
    expect(screen.queryByText('GC-1')).toBeNull()
  })

  it('shows the error state when the request fails', () => {
    setOrdersQuery({ isError: true })

    renderOrdersPage()

    expect(screen.getByText('We could not load orders')).toBeInTheDocument()
    expect(screen.queryByText('No orders found')).toBeNull()
  })

  it('shows the header and no rows while loading', () => {
    setOrdersQuery({ isPending: true })

    renderOrdersPage()

    expect(screen.getByRole('heading', { name: 'Orders' })).toBeInTheDocument()
    expect(screen.queryByText('GC-1')).toBeNull()
    expect(screen.queryByText('No orders found')).toBeNull()
    expect(screen.queryByText('We could not load orders')).toBeNull()
  })
})
