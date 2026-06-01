import { afterEach, describe, expect, it, mock } from 'bun:test'

import { registerBeforeQuitShortcutTeardown } from './register_before_quit_shortcuts.util'

describe('registerBeforeQuitShortcutTeardown', () => {
  afterEach(() => {
    mock.restore()
  })

  it('unregisters all shortcuts', () => {
    const onSpy = mock((_event: 'before-quit', _handler: () => void) => undefined)
    const unregisterAll = mock(() => undefined)

    registerBeforeQuitShortcutTeardown(
      { on: onSpy as (_event: 'before-quit', _handler: () => void) => void },
      { unregisterAll }
    )

    const entry = onSpy.mock.calls[0]
    expect(entry).toBeDefined()
    const event = entry?.[0]
    const handler = entry?.[1] as (() => void) | undefined
    expect(event).toBe('before-quit')
    expect(handler).toBeDefined()
    handler?.()
    expect(unregisterAll).toHaveBeenCalledTimes(1)
  })
})
