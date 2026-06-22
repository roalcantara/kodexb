import type { Display } from 'electrobun/bun'
import type {
  runEntryHandoff as defaultRunEntryHandoff,
  HandoffResult,
  HandoffServices
} from '../handoff/registry.service'

export type RunEntryHandoff = (
  kind: Parameters<typeof defaultRunEntryHandoff>[0],
  payload: Parameters<typeof defaultRunEntryHandoff>[1],
  services: HandoffServices
) => HandoffResult

export type MainWindowLike = {
  setSize: (width: number, height: number) => void
  minimize: () => void
  unminimize: () => void
  getPosition: () => { x: number; y: number }
  setPosition: (x: number, y: number) => void
}

export type ShellHooksUtils = {
  openExternal: (url: string) => boolean
  openPath: (path: string) => boolean
  openFileDialog: (opts: {
    startingFolder?: string
    canChooseFiles: boolean
    canChooseDirectory: boolean
    allowsMultipleSelection: boolean
  }) => Promise<string[]>
}

export type WindowPositionAdapter = {
  platform: NodeJS.Platform
  windowHeight: number
  getDisplay: () => Display
  getPrimaryDisplay: () => Display
}
