import { describe, expect, it } from 'bun:test'
import { createRef } from 'react'

import {
  computeScrollTopAdjustmentForVisibility,
  scheduleDoubleRaf,
  scheduleFocusSearchInputSelectAll
} from './list_scroll.util'

describe('scheduleDoubleRaf', () => {
  describe('scheduleDoubleRaf', () => {
    describe('when two animation frames elapse', () => {
      it('invokes callback', async () => {
        let n = 0
        scheduleDoubleRaf(() => {
          n += 1
        })
        expect(n).toBe(0)
        await new Promise<void>(r => queueMicrotask(r))
        expect(n).toBe(0)
        await new Promise<void>(r => requestAnimationFrame(() => r()))
        expect(n).toBe(0)
        await new Promise<void>(r => requestAnimationFrame(() => r()))
        expect(n).toBe(1)
      })
    })
  })

  describe('scheduleFocusSearchInputSelectAll', () => {
    describe('when double RAF completes', () => {
      it('focuses and selects all text', async () => {
        const ref = createRef<HTMLInputElement>()
        const input = document.createElement('input')
        input.type = 'search'
        document.body.append(input)
        ref.current = input
        input.value = 'hello'
        scheduleFocusSearchInputSelectAll(ref)
        await new Promise<void>(r => queueMicrotask(r))
        await new Promise<void>(r => requestAnimationFrame(() => r()))
        await new Promise<void>(r => requestAnimationFrame(() => r()))
        expect(document.activeElement).toBe(input)
        expect(input.selectionStart).toBe(0)
        expect(input.selectionEnd).toBe(5)
        input.remove()
      })
    })
  })
})

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
