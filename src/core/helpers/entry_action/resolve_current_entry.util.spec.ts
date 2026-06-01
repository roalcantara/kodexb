import { describe, expect, it } from 'bun:test'
import { factoryFor } from '@testing'
import { resolveCurrentEntry } from './resolve_current_entry.util'

const bookmarkRow = factoryFor('bookmark', { overrides: { id: 1, type: 'bookmark' } })
const commandRow = factoryFor('command', { overrides: { id: 2, type: 'command' } })
const rows = [bookmarkRow, commandRow]

describe('resolveCurrentEntry', () => {
  describe('when view state is detail', () => {
    it('uses detailEntry', () => {
      expect(
        resolveCurrentEntry({
          viewState: 'detail',
          selectedId: 1,
          detailEntry: commandRow,
          rows,
          detailPanelHasFocus: false
        })
      ).toEqual(commandRow)
    })
  })

  describe('when split with detail focus', () => {
    it('uses detailEntry', () => {
      expect(
        resolveCurrentEntry({
          viewState: 'split',
          selectedId: 1,
          detailEntry: commandRow,
          rows,
          detailPanelHasFocus: true
        })
      ).toEqual(commandRow)
    })
  })

  describe('when view state is list', () => {
    it('uses selected row', () => {
      expect(
        resolveCurrentEntry({
          viewState: 'list',
          selectedId: 2,
          detailEntry: null,
          rows,
          detailPanelHasFocus: false
        })
      ).toEqual(commandRow)
    })
  })
})
