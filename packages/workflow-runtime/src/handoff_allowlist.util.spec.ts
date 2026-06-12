import { describe, expect, it } from 'bun:test'
import { validateAllowlistShape } from './handoff_allowlist.util'

describe('validateAllowlistShape', () => {
  it('accepts literal entries', () => {
    expect(validateAllowlistShape({ entries: ['ghp_testtoken'] })).toEqual({
      entries: ['ghp_testtoken']
    })
  })
})
