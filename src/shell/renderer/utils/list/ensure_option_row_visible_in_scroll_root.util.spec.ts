/// <reference lib="dom" />
import { describe, expect, it } from 'bun:test'

import { computeScrollTopAdjustmentForVisibility } from './ensure_option_row_visible_in_scroll_root.util'

describe('ensureOptionRowVisibleInScrollRoot', () => {
  describe('when element clips above padded top', () => {
    it('scrolls up', () => {
      expect(computeScrollTopAdjustmentForVisibility(100, 400, 90, 120, 8)).toBe(-18)
    })
  })

  describe('when element clips below padded bottom', () => {
    it('scrolls down', () => {
      expect(computeScrollTopAdjustmentForVisibility(100, 400, 320, 410, 8)).toBe(18)
    })
  })

  describe('with asymmetric bottom pad', () => {
    it('uses provided asymmetrical bottom pad', () => {
      expect(computeScrollTopAdjustmentForVisibility(100, 400, 320, 410, 8, 12)).toBe(22)
    })
  })

  describe('when both edges overflow', () => {
    it('prefers bottom direction', () => {
      expect(computeScrollTopAdjustmentForVisibility(100, 200, 80, 220, 8)).toBe(28)
    })
  })

  describe('when element fits within viewport', () => {
    it('returns zero', () => {
      expect(computeScrollTopAdjustmentForVisibility(100, 400, 120, 160, 8, 12)).toBe(0)
    })
  })
})
