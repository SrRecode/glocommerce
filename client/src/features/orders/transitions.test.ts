import { describe, expect, it } from 'vitest'

import { nextStatuses, ORDER_STATUS_TRANSITIONS } from '@/features/orders/transitions'
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/features/orders/types'

const ALL_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]

const CASES: Array<[OrderStatus, OrderStatus[]]> = [
  ['pending', ['confirmed', 'cancelled']],
  ['confirmed', ['shipped', 'cancelled']],
  ['shipped', ['delivered']],
  ['delivered', []],
  ['cancelled', []],
]

describe('order status transitions', () => {
  it.each(CASES)('maps %s to its allowed next statuses', (status, expected) => {
    expect(ORDER_STATUS_TRANSITIONS[status]).toEqual(expected)
    expect(nextStatuses(status)).toEqual(expected)
  })

  it('defines a transition entry for every order status', () => {
    for (const status of ALL_STATUSES) {
      expect(ORDER_STATUS_TRANSITIONS[status]).toBeDefined()
      expect(Array.isArray(ORDER_STATUS_TRANSITIONS[status])).toBe(true)
    }
  })

  it('keeps delivered and cancelled terminal', () => {
    expect(nextStatuses('delivered')).toEqual([])
    expect(nextStatuses('cancelled')).toEqual([])
  })
})
