import type { MessageBoxOptions, MessageBoxResponse } from 'electrobun/bun'

export type ConfigLoadErrorDeps = {
  showMessageBox: (opts: MessageBoxOptions) => Promise<MessageBoxResponse>
  exit: (code?: number) => void
  logError: (err: unknown) => void
}

/**
 * Show a native error dialog then exit. Pass Electrobun `Utils.showMessageBox`
 * from `main.ts` — kept injectable for tests (importing `electrobun/bun` in
 * specs pulls main-process bootstrap side effects).
 */
export async function reportConfigLoadErrorAndExit(err: unknown, deps: ConfigLoadErrorDeps): Promise<void> {
  deps.logError(err)
  await deps.showMessageBox({
    type: 'error',

    title: 'kb — Configuration Error',
    message: String(err),
    buttons: ['OK']
  })
  deps.exit(1)
}
