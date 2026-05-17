import { describe, expect, it } from 'bun:test'
import { entryActionRecordsVisit } from './entry_action_records_visit.util'

describe('entryActionRecordsVisit()', () => {
  it('returns true for entry use actions', () => {
    expect(entryActionRecordsVisit('open-url')).toBe(true)
    expect(entryActionRecordsVisit('copy')).toBe(true)
    expect(entryActionRecordsVisit('cycle-status')).toBe(true)
  })

  it('returns false for library and app actions', () => {
    expect(entryActionRecordsVisit('sync')).toBe(false)
    expect(entryActionRecordsVisit('new-task')).toBe(false)
    expect(entryActionRecordsVisit('quit')).toBe(false)
  })

  it('returns false for unknown ids', () => {
    expect(entryActionRecordsVisit('unknown')).toBe(false)
  })
})
