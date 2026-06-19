import { describe, expect, it } from 'bun:test'
import { isoSlug } from './perf.script'

describe('perf.script', () => {
  it('isoSlug normalizes timestamp for run directory names', () => {
    expect(isoSlug('2026-05-17T12:34:18.123Z')).toBe('2026-05-17T12-34-18')
  })
})
