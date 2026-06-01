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

  it('initially does not defer blur minimize', () => {
    const clock = 0
    const handoff = makeHandoff(() => clock)
    expect(handoff.shouldDeferBlurMinimize()).toBe(false)
  })

  it('defers blur minimize while the guard window is active', () => {
    let clock = 0
    const handoff = makeHandoff(() => clock)

    handoff.armGuard()
    expect(handoff.shouldDeferBlurMinimize()).toBe(true)
    clock = 99
    expect(handoff.shouldDeferBlurMinimize()).toBe(true)
    clock = 100
    expect(handoff.shouldDeferBlurMinimize()).toBe(false)
  })

  it('disarmGuard immediately allows blur minimize', () => {
    const clock = 0
    const handoff = makeHandoff(() => clock)

    handoff.armGuard()
    expect(handoff.shouldDeferBlurMinimize()).toBe(true)
    handoff.disarmGuard()
    expect(handoff.shouldDeferBlurMinimize()).toBe(false)
  })

  it('hide and show call the provided functions', () => {
    const handoff = createExternalFocusHandoff({
      hide: () => undefined,
      show: () => undefined,
      guardMs: 100
    })

    expect(handoff).toBeDefined()
  })
})
