import { mock } from 'bun:test'

export type ElectrobunBunUtilsMock = {
  openExternal?: () => boolean
  openPath?: () => boolean
  clipboardReadText?: () => string | null
  clipboardWriteText?: (text: string) => void
}

let utilsMock: ElectrobunBunUtilsMock = {}

export const ELECTROBUN_DEFINE_RPC = 'defineRPC' as const

const browserViewStub = {
  [ELECTROBUN_DEFINE_RPC]: <T>(_config: T) =>
    ({
      send: {},
      setTransport: () => undefined
    }) as T
}

/** Re-install electrobun/bun mock; always exports BrowserView for rpc/host.spec.ts. */
export function installElectrobunBunMock(overrides: ElectrobunBunUtilsMock = {}): void {
  utilsMock = overrides
  mock.module('electrobun/bun', () => ({
    BrowserView: browserViewStub,
    ApplicationMenu: {
      setApplicationMenu: () => undefined,
      on: () => undefined
    },
    Utils: {
      openExternal: () => {
        const result = utilsMock.openExternal?.()
        return result ?? false
      },
      openPath: () => {
        const result = utilsMock.openPath?.()
        if (result === undefined) return false
        return result
      },
      clipboardReadText: () => utilsMock.clipboardReadText?.() ?? null,
      clipboardWriteText: (text: string) => {
        utilsMock.clipboardWriteText?.(text)
      }
    },
    default: {
      events: {
        on: () => undefined
      }
    }
  }))
}

installElectrobunBunMock()
