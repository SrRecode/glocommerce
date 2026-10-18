import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'

import { ProductCard } from '@/components/ProductCard'
import type { PublicProduct } from '@/features/catalog/types'

function makeProduct(overrides: Partial<PublicProduct> = {}): PublicProduct {
  return {
    id: 'p1',
    name: 'Linen Apron',
    slug: 'linen-apron',
    description: 'A hard-wearing apron.',
    brand: 'Atelier',
    price: 4999,
    compareAtPrice: null,
    currency: 'PKR',
    category: null,
    images: [],
    stock: 5,
    status: 'active',
    rating: 4.5,
    reviewCount: 12,
    isFeatured: false,
    tags: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderCard(product: PublicProduct) {
  const router = createMemoryRouter([{ path: '/', element: <ProductCard product={product} /> }])

  return render(<RouterProvider router={router} />)
}

describe('ProductCard', () => {
  it('links to the product detail page', () => {
    renderCard(makeProduct())

    expect(screen.getByRole('link', { name: /linen apron/i })).toHaveAttribute(
      'href',
      '/products/linen-apron',
    )
  })

  it('shows the product name and brand', () => {
    renderCard(makeProduct())

    expect(screen.getByRole('heading', { name: 'Linen Apron' })).toBeInTheDocument()
    expect(screen.getByText('Atelier')).toBeInTheDocument()
  })

  it('shows a sale badge when the compare-at price is higher', () => {
    renderCard(makeProduct({ compareAtPrice: 5999 }))

    expect(screen.getByText('Sale')).toBeInTheDocument()
    expect(screen.queryByText('Out of stock')).not.toBeInTheDocument()
  })

  it('shows an out-of-stock badge and hides the sale badge when there is no stock', () => {
    renderCard(makeProduct({ stock: 0, compareAtPrice: 5999 }))

    expect(screen.getByText('Out of stock')).toBeInTheDocument()
    expect(screen.queryByText('Sale')).not.toBeInTheDocument()
  })

  it('renders the rating when there are reviews', () => {
    renderCard(makeProduct())

    expect(screen.getByText(/4\.5/)).toBeInTheDocument()
  })

  it('omits the rating when there are no reviews', () => {
    renderCard(makeProduct({ reviewCount: 0 }))

    expect(screen.queryByText(/4\.5/)).not.toBeInTheDocument()
  })
})
