import { describe, expect, it } from 'vitest'

import { formatDate } from '@/lib/dates'

describe('formatDate', () => {
  it('formats an ISO timestamp as day, abbreviated month, and year', () => {
    expect(formatDate('2026-10-18T00:00:00.000Z')).toBe('18 Oct 2026')
  })

  it('uses UTC rather than the host time zone', () => {
    expect(formatDate('2026-01-01T23:30:00.000Z')).toBe('1 Jan 2026')
  })

  it('returns an empty string for an unparseable value', () => {
    expect(formatDate('')).toBe('')
    expect(formatDate('not-a-date')).toBe('')
  })
})
