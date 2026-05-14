import { describe, expect, test } from 'bun:test'
import { kbLowestLevel } from './logtape.adapter'

describe('kbLowestLevel', () => {
  test('maps verbosity to Logtape lowestLevel', () => {
    expect(kbLowestLevel('default')).toBe('warning')
    expect(kbLowestLevel('verbose')).toBe('info')
    expect(kbLowestLevel('debug')).toBe('debug')
    expect(kbLowestLevel('trace')).toBe('trace')
  })
})
