import { describe, expect, it } from 'bun:test'
import { kbLowestLevel } from './logtape.adapter'

describe('kbLowestLevel', () => {
  it('maps verbosity to Logtape level', () => {
    expect(kbLowestLevel('default')).toBe('warning')
    expect(kbLowestLevel('verbose')).toBe('info')
    expect(kbLowestLevel('debug')).toBe('debug')
    expect(kbLowestLevel('trace')).toBe('trace')
  })
})
