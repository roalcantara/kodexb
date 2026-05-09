import { describe, expect, it } from 'bun:test'
import { parseNotes } from './notes.parser'

describe('parseNotes()', () => {
  it('returns [] for null', () => {
    expect(parseNotes(null)).toEqual([])
  })

  it('returns [] for undefined', () => {
    expect(parseNotes(undefined)).toEqual([])
  })

  it('wraps a string in an md fragment', () => {
    expect(parseNotes('Hello world')).toEqual([{ format: 'md', payload: 'Hello world' }])
  })

  it('parses a single object as one fragment', () => {
    expect(parseNotes({ md: 'content' })).toEqual([{ format: 'md', payload: 'content' }])
  })

  it('parses an array of objects into fragments', () => {
    expect(parseNotes([{ md: 'a' }, { sh: 'echo hi' }])).toEqual([
      { format: 'md', payload: 'a' },
      { format: 'sh', payload: 'echo hi' }
    ])
  })

  it('skips non-object array entries', () => {
    expect(parseNotes([null as unknown as Record<string, string>, { md: 'ok' }])).toEqual([
      { format: 'md', payload: 'ok' }
    ])
  })
})
