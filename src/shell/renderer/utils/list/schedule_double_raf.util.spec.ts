/// <reference lib="dom" />

import { describe, expect, it } from 'bun:test'
import { createRef } from 'react'

import { scheduleDoubleRaf, scheduleFocusSearchInputSelectAll } from './schedule_double_raf.util'

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
