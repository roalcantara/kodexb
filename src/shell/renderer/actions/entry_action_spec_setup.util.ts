import { mock } from 'bun:test'
import type { EntryActionPanelDeps } from './entry_action_panel_deps.util'

/** Avoid importing `rpc/client` before `client.spec.tsx` initializes Electrobun. */
export function installEntryActionPanelDepsMock(): EntryActionPanelDeps {
  const noop = mock(() => Promise.resolve())
  const deps: EntryActionPanelDeps = {
    openExternal: noop,
    openInEditor: noop,
    cycleStatus: noop,
    cyclePriority: noop,
    quitApp: noop
  }
  mock.module('./entry_action_panel_deps.util', () => ({
    defaultEntryActionPanelDeps: () => deps
  }))
  return deps
}

export function installRecordEntryVisitMock(): ReturnType<typeof mock<(id: number) => void>> {
  const recordEntryVisitFireAndForget = mock<(id: number) => void>()
  mock.module('../utils/list/list_frecency.util', () => ({
    recordEntryVisitFireAndForget
  }))
  return recordEntryVisitFireAndForget
}

export async function withMockClipboard(writeText: () => Promise<void>, run: () => Promise<void>): Promise<void> {
  const prev = navigator.clipboard
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true
  })
  try {
    await run()
  } finally {
    Object.defineProperty(navigator, 'clipboard', { value: prev, configurable: true, writable: true })
  }
}
