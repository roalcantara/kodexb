import { describe, expect, it } from 'bun:test'
import { crc32 } from './crc32'

describe('crc32()', () => {
  it('is deterministic', () => {
    expect(crc32('hello')).toBe(crc32('hello'))
  })

  it('differs for different inputs', () => {
    expect(crc32('bookmark:foo')).not.toBe(crc32('command:foo'))
  })

  it('returns a valid 32-bit integer', () => {
    const r = crc32('test')
    expect(r).toBeGreaterThanOrEqual(0)
    expect(r).toBeLessThanOrEqual(0xffffffff)
  })

  describe.each([
    ['empty string', '', 0x00000000],
    ['known "hello" crc32', 'hello', 0x3610a686]
  ])('known values: %s', (_, input, expected) => {
    it(`crc32("${input}") === ${expected}`, () => {
      expect(crc32(input)).toBe(expected)
    })
  })
})
