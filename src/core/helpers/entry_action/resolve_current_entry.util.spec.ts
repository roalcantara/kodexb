import { describe, expect, test } from 'bun:test'
import { resolveCurrentEntry } from './resolve_current_entry.util'

const bookmarkRow = { id: 1, type: 'bookmark' as const }
const commandRow = { id: 2, type: 'command' as const }
const rows = [bookmarkRow, commandRow]

describe('resolveCurrentEntry()', () => {
  test('detail view uses detailEntry', () => {
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

  test('split with detail focus uses detailEntry', () => {
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

  test('list uses selected row', () => {
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
