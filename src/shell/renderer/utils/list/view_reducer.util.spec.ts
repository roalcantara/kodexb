import { describe, expect, it } from 'bun:test'
import { viewReducer } from './view_reducer.util'

describe('viewReducer', () => {
  describe('ADVANCE', () => {
    it('list -> split', () => expect(viewReducer('list', 'ADVANCE')).toBe('split'))
    it('split -> detail', () => expect(viewReducer('split', 'ADVANCE')).toBe('detail'))
    it('detail -> detail (no-op)', () => expect(viewReducer('detail', 'ADVANCE')).toBe('detail'))
  })

  describe('RETREAT', () => {
    it('detail -> split', () => expect(viewReducer('detail', 'RETREAT')).toBe('split'))
    it('split -> list', () => expect(viewReducer('split', 'RETREAT')).toBe('list'))
    it('list -> list (no-op)', () => expect(viewReducer('list', 'RETREAT')).toBe('list'))
  })

  describe('CLOSE_TO_LIST', () => {
    it('any state -> list', () => {
      expect(viewReducer('detail', 'CLOSE_TO_LIST')).toBe('list')
      expect(viewReducer('split', 'CLOSE_TO_LIST')).toBe('list')
      expect(viewReducer('list', 'CLOSE_TO_LIST')).toBe('list')
    })
  })
})
