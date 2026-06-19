import { describe, expect, it } from 'bun:test'
import { sliceIdFromAcTag } from './handoff_ac_tag.util'

describe('sliceIdFromAcTag', () => {
  it('maps @ac:SF-1_AC2 to sf1ac2', () => {
    expect(sliceIdFromAcTag('@ac:SF-1_AC2')).toBe('sf1ac2')
  })

  it('returns null for invalid tags', () => {
    expect(sliceIdFromAcTag('@sync')).toBeNull()
  })
})
