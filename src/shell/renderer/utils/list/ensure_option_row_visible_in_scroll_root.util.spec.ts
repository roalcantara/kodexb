/// <reference lib="dom" />
import { expect, test } from 'bun:test'

import { computeScrollTopAdjustmentForVisibility } from './ensure_option_row_visible_in_scroll_root.util'

test('computeScrollTopAdjustmentForVisibility scrolls up when element clips above padded top', () => {
  expect(computeScrollTopAdjustmentForVisibility(100, 400, 90, 120, 8)).toBe(-18)
})

test('computeScrollTopAdjustmentForVisibility scrolls down when element clips below padded bottom', () => {
  expect(computeScrollTopAdjustmentForVisibility(100, 400, 320, 410, 8)).toBe(18)
})

test('computeScrollTopAdjustmentForVisibility uses asymmetric bottom pad when provided', () => {
  expect(computeScrollTopAdjustmentForVisibility(100, 400, 320, 410, 8, 12)).toBe(22)
})

test('computeScrollTopAdjustmentForVisibility prefers bottom when both edges overflow', () => {
  expect(computeScrollTopAdjustmentForVisibility(100, 200, 80, 220, 8)).toBe(28)
})

test('computeScrollTopAdjustmentForVisibility returns zero when element fits', () => {
  expect(computeScrollTopAdjustmentForVisibility(100, 400, 120, 160, 8, 12)).toBe(0)
})
