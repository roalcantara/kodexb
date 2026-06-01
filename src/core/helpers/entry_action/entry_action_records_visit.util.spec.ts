import { describe, expect, it } from 'bun:test'
import { entryActionRecordsVisit } from './entry_action_records_visit.util'

describe('entryActionRecordsVisit()', () => {
  describe('when action records a visit', () => {
    describe.each(['open-url', 'copy', 'cycle-status'])('with %s', actionId => {
      it('returns true', () => {
        expect(entryActionRecordsVisit(actionId)).toBe(true)
      })
    })
  })

  describe('when action does not record a visit', () => {
    describe.each(['sync', 'new-task', 'quit', 'unknown'])('with %s', actionId => {
      it('returns false', () => {
        expect(entryActionRecordsVisit(actionId)).toBe(false)
      })
    })
  })
})
