import {
  cyclePriority,
  cycleStatus,
  openExternal,
  openInEditor,
  pasteDoc,
  pasteInTerminal,
  quitApp,
  runInTerminal
} from '../../rpc/client'

export type EntryActionPanelDeps = {
  openExternal: (url: string) => Promise<unknown>
  openInEditor: (filePath: string) => Promise<unknown>
  cycleStatus: (id: number, direction: 'forward' | 'backward') => Promise<unknown>
  cyclePriority: (id: number, direction: 'forward' | 'backward') => Promise<unknown>
  runInTerminal: (cmd: string) => Promise<unknown>
  pasteInTerminal: (cmd: string) => Promise<unknown>
  pasteDoc: (doc: string) => Promise<unknown>
  quitApp: () => Promise<unknown>
}

export function defaultEntryActionPanelDeps(): EntryActionPanelDeps {
  return {
    openExternal,
    openInEditor,
    cycleStatus,
    cyclePriority,
    runInTerminal,
    pasteInTerminal,
    pasteDoc,
    quitApp
  }
}
