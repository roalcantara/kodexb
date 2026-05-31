import { describe, expect, it } from 'bun:test'

import { recordingTerminalShellHook, throwingShellHook } from './shell_hook_spec.util'

describe('recordingTerminalShellHook', () => {
  it('records cmd and terminalApp on the named hook', () => {
    const calls: [string, string | undefined][] = []
    const hooks = recordingTerminalShellHook('pasteInTerminal', calls)
    hooks.pasteInTerminal?.('ls', 'Terminal')
    expect(calls).toEqual([['ls', 'Terminal']])
  })
})

describe('throwingShellHook', () => {
  it('throws with the given message', () => {
    const hooks = throwingShellHook('pasteDoc', 'paste fail')
    expect(() => hooks.pasteDoc?.('doc')).toThrow('paste fail')
  })
})
