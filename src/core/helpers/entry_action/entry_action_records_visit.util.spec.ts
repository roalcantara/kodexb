import { describe, expect, test } from 'bun:test'
import { entryActionRecordsVisit } from './entry_action_records_visit.util'

describe('entryActionRecordsVisit()', () => {
  test('returns true for entry use actions', () => {
    expect(entryActionRecordsVisit('open-url')).toBe(true)
    expect(entryActionRecordsVisit('copy')).toBe(true)
    expect(entryActionRecordsVisit('cycle-status')).toBe(true)
  })

  test('returns false for library and app actions', () => {
    expect(entryActionRecordsVisit('sync')).toBe(false)
    expect(entryActionRecordsVisit('new-task')).toBe(false)
    expect(entryActionRecordsVisit('quit')).toBe(false)
  })

  test('returns false for unknown ids', () => {
    expect(entryActionRecordsVisit('unknown')).toBe(false)
  })
})
