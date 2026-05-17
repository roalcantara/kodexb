import { describe, expect, it } from 'bun:test'

import { virtualListWindow } from './virtual_list_window.util'

describe('virtualListWindow', () => {
  describe('with normal viewport', () => {
    it('renders viewport rows plus overscan', () => {
      expect(
        virtualListWindow({ total: 1000, scrollTop: 0, viewportHeight: 880, rowHeight: 44, overscan: 10 })
      ).toEqual({
        startIndex: 0,
        endIndex: 30,
        paddingTop: 0,
        paddingBottom: 42_680
      })
    })
  })

  describe('while scrolling', () => {
    it('adds top and bottom spacer heights', () => {
      expect(
        virtualListWindow({ total: 1000, scrollTop: 880, viewportHeight: 880, rowHeight: 44, overscan: 10 })
      ).toEqual({
        startIndex: 15,
        endIndex: 45,
        paddingTop: 660,
        paddingBottom: 42_020
      })
    })
  })

  describe('before viewport measurement', () => {
    it('renders a safe default', () => {
      expect(virtualListWindow({ total: 1000, scrollTop: 0, viewportHeight: 0, rowHeight: 44, overscan: 5 })).toEqual({
        startIndex: 0,
        endIndex: 35,
        paddingTop: 0,
        paddingBottom: 42_460
      })
    })
  })
})
