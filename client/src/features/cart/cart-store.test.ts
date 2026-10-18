import { beforeEach, describe, expect, it } from 'vitest'

import type { CartItem } from '@/features/cart/cart-store'
import {
  clampQuantity,
  selectCurrency,
  selectSubtotal,
  selectTotalItems,
  useCartStore,
} from '@/features/cart/cart-store'

type NewItem = Omit<CartItem, 'quantity'>

function makeItem(overrides: Partial<NewItem> = {}): NewItem {
  return {
    productId: 'p1',
    slug: 'linen-apron',
    name: 'Linen Apron',
    image: null,
    unitPrice: 4999,
    currency: 'PKR',
    maxStock: 10,
    ...overrides,
  }
}

beforeEach(() => {
  useCartStore.getState().clear()
})

describe('clampQuantity', () => {
  it('passes a quantity within range through', () => {
    expect(clampQuantity(5, 10)).toBe(5)
  })

  it('floors at one', () => {
    expect(clampQuantity(0, 10)).toBe(1)
  })

  it('caps at available stock', () => {
    expect(clampQuantity(200, 10)).toBe(10)
  })

  it('caps at the internal maximum when stock is unknown', () => {
    expect(clampQuantity(200, 0)).toBe(99)
  })

  it('rounds fractional quantities', () => {
    expect(clampQuantity(2.6, 10)).toBe(3)
  })

  it('falls back to one for non-finite quantities', () => {
    expect(clampQuantity(Number.NaN, 10)).toBe(1)
  })

  it('respects a stock ceiling below the requested quantity', () => {
    expect(clampQuantity(5, 3)).toBe(3)
  })
})

describe('cart store', () => {
  it('adds a new item with a default quantity of one', () => {
    useCartStore.getState().addItem(makeItem())

    const { items } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].productId).toBe('p1')
    expect(items[0].quantity).toBe(1)
  })

  it('merges a repeated product and increments its quantity', () => {
    useCartStore.getState().addItem(makeItem())
    useCartStore.getState().addItem(makeItem(), 2)

    const { items } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(3)
  })

  it('clamps the merged quantity to available stock', () => {
    useCartStore.getState().addItem(makeItem({ maxStock: 2 }))
    useCartStore.getState().addItem(makeItem({ maxStock: 2 }), 5)

    expect(useCartStore.getState().items[0].quantity).toBe(2)
  })

  it('sets a quantity clamped to stock', () => {
    useCartStore.getState().addItem(makeItem())
    useCartStore.getState().setQuantity('p1', 50)

    expect(useCartStore.getState().items[0].quantity).toBe(10)
  })

  it('removes an item', () => {
    useCartStore.getState().addItem(makeItem())
    useCartStore.getState().removeItem('p1')

    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('clears the cart', () => {
    useCartStore.getState().addItem(makeItem())
    useCartStore.getState().clear()

    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('sums total item quantities', () => {
    useCartStore.getState().addItem(makeItem())
    useCartStore.getState().addItem(makeItem({ productId: 'p2' }), 4)

    expect(selectTotalItems(useCartStore.getState())).toBe(5)
  })

  it('sums the subtotal', () => {
    useCartStore.getState().addItem(makeItem({ unitPrice: 1000 }))
    useCartStore.getState().addItem(makeItem({ productId: 'p2', unitPrice: 2500 }), 2)

    expect(selectSubtotal(useCartStore.getState())).toBe(6000)
  })

  it('reports the currency of the first item', () => {
    useCartStore.getState().addItem(makeItem({ currency: 'USD' }))

    expect(selectCurrency(useCartStore.getState())).toBe('USD')
  })

  it('defaults the currency to PKR for an empty cart', () => {
    expect(selectCurrency(useCartStore.getState())).toBe('PKR')
  })
})
