import { afterAll, beforeAll, beforeEach } from 'bun:test'

let _origBunDollar: typeof Bun.$
let _shouldThrow = false

export function installBunDollarMock(): void {
  _origBunDollar = Bun.$
  _shouldThrow = false
  Bun.$ = (() => {
    if (_shouldThrow) throw new Error('osascript failed')
    return { quiet: () => ({ nothrow: () => undefined }) }
  }) as unknown as typeof Bun.$
}

export function uninstallBunDollarMock(): void {
  Bun.$ = _origBunDollar
}

export function resetBunDollarMock(): void {
  _shouldThrow = false
}

export function setBunDollarThrow(v: boolean): void {
  _shouldThrow = v
}

export function setupBunDollarMock(): void {
  beforeAll(() => installBunDollarMock())
  beforeEach(() => resetBunDollarMock())
  afterAll(() => uninstallBunDollarMock())
}
