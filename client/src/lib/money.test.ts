import { describe, expect, it } from 'vitest'

import { formatMoney } from '@/lib/money'

describe('formatMoney', () => {
  it('formats a PKR amount with grouping and two decimals', () => {
    expect(formatMoney(4999.5)).toBe('Rs 4,999.50')
  })

  it('formats zero', () => {
    expect(formatMoney(0)).toBe('Rs 0.00')
  })

  it('groups thousands', () => {
    expect(formatMoney(1234567)).toBe('Rs 1,234,567.00')
  })

  it('formats USD', () => {
    expect(formatMoney(10, 'USD')).toBe('$10.00')
  })

  it('formats EUR', () => {
    expect(formatMoney(5.5, 'EUR')).toBe('\u20AC5.50')
  })

  it('formats GBP', () => {
    expect(formatMoney(5.5, 'GBP')).toBe('\u00A35.50')
  })

  it('places the sign before the symbol for negative amounts', () => {
    expect(formatMoney(-12.5)).toBe('-Rs 12.50')
  })

  it('falls back to zero for non-finite amounts', () => {
    expect(formatMoney(Number.NaN)).toBe('Rs 0.00')
    expect(formatMoney(Number.POSITIVE_INFINITY)).toBe('Rs 0.00')
  })

  it('falls back to a code prefix for unknown currencies', () => {
    expect(formatMoney(10, 'JPY')).toBe('JPY 10.00')
  })

  it('rounds to the nearest minor unit', () => {
    expect(formatMoney(1.999)).toBe('Rs 2.00')
    expect(formatMoney(0.005)).toBe('Rs 0.01')
  })
})
