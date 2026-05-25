import { describe, expect, it } from 'bun:test'
import type { Knowledge } from '@core'
import { factoryFor } from '@testing'
import { computeCooccurrence, countCooccurrence } from './cooccurrence.util'

const taskRow = (overrides: Partial<Knowledge>): Knowledge =>
  factoryFor('task', { overrides: overrides as Record<string, unknown> }) as Knowledge

describe('countCooccurrence', () => {
  it('counts shared tags between entries', () => {
    const cooc = new Map<string, number>()
    countCooccurrence(cooc, ['dev', 'shell'], new Set(['dev']))
    expect(cooc.get('shell')).toBe(1)
  })

  it('skips tags already on the entry', () => {
    const cooc = new Map<string, number>()
    countCooccurrence(cooc, ['dev', 'shell'], new Set(['dev', 'shell']))
    expect(cooc.has('dev')).toBe(false)
    expect(cooc.has('shell')).toBe(false)
  })

  it('skips entries with no shared tags', () => {
    const cooc = new Map<string, number>()
    countCooccurrence(cooc, ['dev'], new Set(['design']))
    expect(cooc.size).toBe(0)
  })
})

describe('computeCooccurrence', () => {
  it('returns top co-occurring tags', () => {
    const entry = taskRow({ id: 1, tags: ['dev'] })
    const all = [
      entry,
      taskRow({ id: 2, tags: ['dev', 'shell'] }),
      taskRow({ id: 3, tags: ['dev', 'shell'] }),
      taskRow({ id: 4, tags: ['dev', 'bun'] })
    ]
    const result = computeCooccurrence(entry, all, new Set(['dev']))
    expect(result).toContain('shell')
    expect(result.length).toBeGreaterThan(0)
  })

  it('excludes own entry', () => {
    const entry = taskRow({ id: 1, tags: ['dev'] })
    const result = computeCooccurrence(entry, [entry], new Set(['dev']))
    expect(result).toEqual([])
  })
})
