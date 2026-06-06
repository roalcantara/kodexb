// @list_frecency_sort
import { describe, expect, it } from 'bun:test'
import { bumpFrecency, FRECENCY_BUMP_WEIGHT, FRECENCY_HALF_LIFE_MS, type FrecencyState } from './bump_frecency.util'

const T0 = 1_700_000_000_000

describe('bumpFrecency()', () => {
  it('starts at bump weight on first visit', () => {
    const next = bumpFrecency(null, T0)
    expect(next).toEqual({
      frecencyScore: FRECENCY_BUMP_WEIGHT,
      lastVisitedAt: T0,
      visitCount: 1
    })
  })

  it('adds full bump when revisiting immediately', () => {
    const first = bumpFrecency(null, T0)
    const second = bumpFrecency(first, T0 + 1)
    expect(second.frecencyScore).toBeCloseTo(FRECENCY_BUMP_WEIGHT * 2)
    expect(second.visitCount).toBe(2)
  })

  it('decays prior score after one half-life', () => {
    const afterHalfLife: FrecencyState = {
      frecencyScore: 4,
      lastVisitedAt: T0,
      visitCount: 3
    }
    const next = bumpFrecency(afterHalfLife, T0 + FRECENCY_HALF_LIFE_MS)
    expect(next.frecencyScore).toBeCloseTo(4 * 0.5 + FRECENCY_BUMP_WEIGHT)
    expect(next.visitCount).toBe(4)
  })

  it('decays to near zero after many half-lives', () => {
    const stale: FrecencyState = {
      frecencyScore: 10,
      lastVisitedAt: T0,
      visitCount: 5
    }
    const next = bumpFrecency(stale, T0 + FRECENCY_HALF_LIFE_MS * 10)
    expect(next.frecencyScore).toBeLessThan(1.02)
    expect(next.frecencyScore).toBeGreaterThan(FRECENCY_BUMP_WEIGHT * 0.5)
  })
})
