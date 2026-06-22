import { describe, expect, it } from 'bun:test'
import { listWheelScrollActive, viewReducer } from './list_page_state.util'

describe('viewReducer', () => {
  describe('when ADVANCE is dispatched', () => {
    it('list -> split', () => expect(viewReducer('list', 'ADVANCE')).toBe('split'))
    it('split -> detail', () => expect(viewReducer('split', 'ADVANCE')).toBe('detail'))
    it('detail -> detail (no-op)', () => expect(viewReducer('detail', 'ADVANCE')).toBe('detail'))
  })

  describe('when RETREAT is dispatched', () => {
    it('detail -> split', () => expect(viewReducer('detail', 'RETREAT')).toBe('split'))
    it('split -> list', () => expect(viewReducer('split', 'RETREAT')).toBe('list'))
    it('list -> list (no-op)', () => expect(viewReducer('list', 'RETREAT')).toBe('list'))
  })

  describe('when CLOSE_TO_LIST is dispatched', () => {
    it('any state -> list', () => {
      expect(viewReducer('detail', 'CLOSE_TO_LIST')).toBe('list')
      expect(viewReducer('split', 'CLOSE_TO_LIST')).toBe('list')
      expect(viewReducer('list', 'CLOSE_TO_LIST')).toBe('list')
    })
  })
})

describe('listWheelScrollActive', () => {
  const open = {
    showSettings: false,
    taskSheetVisible: false,
    filterOpen: false,
    paletteOpen: false,
    quickLookupOpen: false,
    syncModalOpen: false,
    detailEntry: null,
    viewState: 'list' as const
  }

  it('is active on the bare list surface', () => {
    expect(listWheelScrollActive(open)).toBe(true)
  })

  it('is inactive when detail is full-screen', () => {
    expect(listWheelScrollActive({ ...open, detailEntry: { id: 1 }, viewState: 'detail' })).toBe(false)
  })

  it('stays active in split view with a detail entry', () => {
    expect(listWheelScrollActive({ ...open, detailEntry: { id: 1 }, viewState: 'split' })).toBe(true)
  })
})
