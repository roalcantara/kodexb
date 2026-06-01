import { describe, expect, it } from 'bun:test'
import { createExternalFocusHandoff } from './external_focus_handoff.util'

describe('createExternalFocusHandoff', () => {
  function makeHandoff(now?: () => number) {
    return createExternalFocusHandoff({
      hide: () => undefined,
      show: () => undefined,
      guardMs: 100,
      now
    })
  }

  describe('when the guard is not armed', () => {
    it('does not defer blur minimize', () => {
      const clock = 0
      const handoff = makeHandoff(() => clock)
      expect(handoff.shouldDeferBlurMinimize()).toBe(false)
    })
  })

  describe('while the guard is active', () => {
    it('defers blur minimize', () => {
      let clock = 0
      const handoff = makeHandoff(() => clock)

      handoff.armGuard()
      expect(handoff.shouldDeferBlurMinimize()).toBe(true)
      clock = 99
      expect(handoff.shouldDeferBlurMinimize()).toBe(true)
      clock = 100
      expect(handoff.shouldDeferBlurMinimize()).toBe(false)
    })
  })

  describe('when the guard is disarmed', () => {
    it('allows blur minimize', () => {
      const clock = 0
      const handoff = makeHandoff(() => clock)

      handoff.armGuard()
      expect(handoff.shouldDeferBlurMinimize()).toBe(true)
      handoff.disarmGuard()
      expect(handoff.shouldDeferBlurMinimize()).toBe(false)
    })
  })
})
