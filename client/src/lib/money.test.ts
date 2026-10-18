import { describe, expect, it } from 'vitest'

import { formatMoney } from '@/lib/money'

describe('formatMoney', () => {
  it('formats a PKR amount in minor units with grouping and two decimals', () => {
    expect(formatMoney(499950)).toBe('Rs 4,999.50')
  })

  it('formats zero', () => {
    expect(formatMoney(0)).toBe('Rs 0.00')
  })

  it('groups thousands', () => {
    expect(formatMoney(123456700)).toBe('Rs 1,234,567.00')
  })

  it('formats USD', () => {
    expect(formatMoney(1000, 'USD')).toBe('$10.00')
  })

  it('formats EUR', () => {
    expect(formatMoney(550, 'EUR')).toBe('\u20AC5.50')
  })

  it('formats GBP', () => {
    expect(formatMoney(550, 'GBP')).toBe('\u00A35.50')
  })

  it('places the sign before the symbol for negative amounts', () => {
    expect(formatMoney(-1250)).toBe('-Rs 12.50')
  })

  it('falls back to zero for non-finite amounts', () => {
    expect(formatMoney(Number.NaN)).toBe('Rs 0.00')
    expect(formatMoney(Number.POSITIVE_INFINITY)).toBe('Rs 0.00')
  })

  it('falls back to a code prefix for unknown currencies', () => {
    expect(formatMoney(1000, 'JPY')).toBe('JPY 10.00')
  })

  it('rounds fractional minor units to the nearest whole unit', () => {
    expect(formatMoney(1999.4)).toBe('Rs 19.99')
    expect(formatMoney(1999.6)).toBe('Rs 20.00')
  })
})
