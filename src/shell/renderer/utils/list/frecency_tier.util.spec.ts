import { describe, expect, it } from 'bun:test'
import { frecencyDisplayTier } from './frecency_tier.util'

describe('frecencyDisplayTier()', () => {
  it('returns 0 when score is zero', () => {
    expect(frecencyDisplayTier(0, 10)).toBe(0)
  })

  it('returns tier 3 for top third of list max', () => {
    expect(frecencyDisplayTier(10, 10)).toBe(3)
    expect(frecencyDisplayTier(7, 10)).toBe(3)
  })

  it('returns tier 1 for low non-zero scores', () => {
    expect(frecencyDisplayTier(1, 10)).toBe(1)
  })
})
