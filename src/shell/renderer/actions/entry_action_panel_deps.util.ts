import { cyclePriority, cycleStatus, openExternal, openInEditor, quitApp } from '../rpc/client'

export type EntryActionPanelDeps = {
  openExternal: (url: string) => Promise<unknown>
  openInEditor: (filePath: string) => Promise<unknown>
  cycleStatus: (id: number, direction: 'forward' | 'backward') => Promise<unknown>
  cyclePriority: (id: number, direction: 'forward' | 'backward') => Promise<unknown>
  quitApp: () => Promise<unknown>
}

export function defaultEntryActionPanelDeps(): EntryActionPanelDeps {
  return {
    openExternal,
    openInEditor,
    cycleStatus,
    cyclePriority,
    quitApp
  }
}
