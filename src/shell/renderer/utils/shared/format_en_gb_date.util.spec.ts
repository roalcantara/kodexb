import { describe, expect, it } from 'bun:test'
import { formatEnGbDate } from './format_en_gb_date.util'

describe('formatEnGbDate', () => {
  it('returns empty string for missing or invalid input', () => {
    expect(formatEnGbDate(undefined)).toBe('')
    expect(formatEnGbDate(null)).toBe('')
    expect(formatEnGbDate(Number.NaN)).toBe('')
  })

  it('formats short month/day in en-GB', () => {
    const formatted = formatEnGbDate(Date.UTC(2026, 4, 27))
    expect(formatted).toContain('27')
    expect(formatted.toLowerCase()).toContain('may')
  })

  it('includes year when style is withYear', () => {
    const formatted = formatEnGbDate(Date.UTC(2026, 4, 27), 'withYear')
    expect(formatted).toContain('2026')
  })
})
