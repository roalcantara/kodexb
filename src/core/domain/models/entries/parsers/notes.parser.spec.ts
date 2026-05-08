import { describe, expect, it } from 'bun:test'
import { parseNoteBlock, parseNoteBlocksFromSource } from './notes.parser'

describe('parseNoteBlock', () => {
  it('throws when note is not an object', () => {
    expect(() => parseNoteBlock(null)).toThrow('Each note must be a non-empty object')
  })

  it('throws when language is unsupported', () => {
    expect(() => parseNoteBlock({ nope: 'text' })).toThrow('Unsupported note block language')
  })

  it('returns a valid note block', () => {
    expect(parseNoteBlock({ md: 'hello' })).toEqual({ md: 'hello' })
  })
})

describe('parseNoteBlocksFromSource', () => {
  it('parses markdown scalar as md block', () => {
    expect(parseNoteBlocksFromSource('hello')).toEqual([{ md: 'hello' }])
  })

  it('parses single map into one-item list', () => {
    expect(parseNoteBlocksFromSource({ md: 'hello' })).toEqual([{ md: 'hello' }])
  })

  it('leniently skips invalid array entries', () => {
    expect(parseNoteBlocksFromSource([{ md: 'ok' }, null, { nope: 'x' }])).toEqual([{ md: 'ok' }])
  })
})
