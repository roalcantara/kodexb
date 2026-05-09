import { expect, test } from 'bun:test'

import { virtualListWindow } from './virtual_list_window.util'

test('virtualListWindow renders viewport rows plus overscan', () => {
  expect(virtualListWindow({ total: 1000, scrollTop: 0, viewportHeight: 880, rowHeight: 44, overscan: 10 })).toEqual({
    startIndex: 0,
    endIndex: 30,
    paddingTop: 0,
    paddingBottom: 42_680
  })
})

test('virtualListWindow adds top and bottom spacer heights while scrolling', () => {
  expect(virtualListWindow({ total: 1000, scrollTop: 880, viewportHeight: 880, rowHeight: 44, overscan: 10 })).toEqual({
    startIndex: 15,
    endIndex: 45,
    paddingTop: 660,
    paddingBottom: 42_020
  })
})

test('virtualListWindow renders a safe default before viewport measurement', () => {
  expect(virtualListWindow({ total: 1000, scrollTop: 0, viewportHeight: 0, rowHeight: 44, overscan: 5 })).toEqual({
    startIndex: 0,
    endIndex: 35,
    paddingTop: 0,
    paddingBottom: 42_460
  })
})
