import { describe, expect, it } from 'bun:test'
import { frecencyDisplayTier } from './frecency_tier.util'

describe('frecencyDisplayTier()', () => {
  describe('when score is zero', () => {
    it('returns 0', () => {
      expect(frecencyDisplayTier(0, 10)).toBe(0)
    })
  })

  describe('when score is in top third', () => {
    it('returns tier 3', () => {
      expect(frecencyDisplayTier(10, 10)).toBe(3)
      expect(frecencyDisplayTier(7, 10)).toBe(3)
    })
  })

  describe('with low non-zero scores', () => {
    it('returns tier 1', () => {
      expect(frecencyDisplayTier(1, 10)).toBe(1)
    })
  })
})
