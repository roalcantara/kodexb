import type { AppShellHooks } from '../../shell/app/lib/app_shell_hooks.types'

export type TerminalShellHookName = 'pasteInTerminal' | 'runInTerminal'

export function recordingTerminalShellHook(
  hookName: TerminalShellHookName,
  calls: [string, string | undefined][]
): AppShellHooks {
  return {
    [hookName]: (cmd: string, terminalApp?: string) => {
      calls.push([cmd, terminalApp])
    }
  }
}

export function throwingShellHook(hookName: keyof AppShellHooks, message: string): AppShellHooks {
  return {
    [hookName]: () => {
      throw new Error(message)
    }
  } as AppShellHooks
}
