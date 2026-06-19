import { afterEach, describe, expect, it, mock } from 'bun:test'
import { factoryFor } from '@testing'
import {
  dismissLauncherWindow,
  isLauncherDismissed,
  LAUNCHER_SUMMON_ACCELERATOR,
  type LauncherWindow,
  presentLauncherWindow,
  registerLauncherSummonShortcut,
  resetLauncherWindowStateForTests,
  toggleLauncherWindow
} from './launcher_window.util'

const mockLauncherWindow: LauncherWindow = {
  hide: mock(() => undefined),
  show: mock(() => undefined),
  activate: mock(() => undefined),
  setAlwaysOnTop: mock(() => undefined),
  setVisibleOnAllWorkspaces: mock(() => undefined),
  setFrame: mock(() => undefined),
  getFrame: mock(() => ({ x: 0, y: 0, width: 748, height: 600 })),
  setSize: mock(() => undefined),
  minimize: mock(() => undefined),
  unminimize: mock(() => undefined),
  getPosition: mock(() => ({ x: 0, y: 0 })),
  setPosition: mock(() => undefined)
}

function makeLauncherWindow(overrides: Partial<LauncherWindow> = {}) {
  return {
    ...mockLauncherWindow,
    ...overrides
  }
}

const workArea = factoryFor('rectangle')
const display = {
  id: 1,
  bounds: workArea,
  workArea,
  scaleFactor: 1,
  isPrimary: true
}

const screen = {
  getCursorScreenPoint: () => ({ x: 400, y: 300 }),
  getAllDisplays: () => [display],
  getPrimaryDisplay: () => display
}

const log = { debug: mock(() => undefined), info: mock(() => undefined), warn: mock(() => undefined) }

afterEach(() => {
  resetLauncherWindowStateForTests()
  ;(log.debug as ReturnType<typeof mock>).mockClear()
  ;(log.info as ReturnType<typeof mock>).mockClear()
  ;(log.warn as ReturnType<typeof mock>).mockClear()
})

describe('isLauncherDismissed', () => {
  it('returns true before the launcher has been presented', () => {
    expect(isLauncherDismissed()).toBe(true)
  })

  it('returns false after present and true again after dismiss', () => {
    const win = makeLauncherWindow()
    presentLauncherWindow(win, screen, log)
    expect(isLauncherDismissed()).toBe(false)
    dismissLauncherWindow(win)
    expect(isLauncherDismissed()).toBe(true)
  })
})

describe('presentLauncherWindow', () => {
  it('sets frame before show and raises the panel', () => {
    const win = makeLauncherWindow()
    const callOrder: string[] = []
    win.setFrame = mock(() => {
      callOrder.push('setFrame')
    })
    win.show = mock(() => {
      callOrder.push('show')
    })

    presentLauncherWindow(win, screen, log)

    expect(callOrder.indexOf('setFrame')).toBeLessThan(callOrder.indexOf('show'))
    expect(win.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true)
    expect(win.setAlwaysOnTop).toHaveBeenCalledWith(true)
    expect(win.show).toHaveBeenCalled()
    expect(win.activate).toHaveBeenCalled()
  })
})

describe('dismissLauncherWindow', () => {
  it('clears always-on-top before hiding', () => {
    const win = makeLauncherWindow()

    dismissLauncherWindow(win)

    expect(win.setAlwaysOnTop).toHaveBeenCalledWith(false)
    expect(win.hide).toHaveBeenCalled()
  })
})

describe('toggleLauncherWindow', () => {
  it('presents when dismissed and hides when raised', () => {
    const win = makeLauncherWindow()
    toggleLauncherWindow(win, screen, log)
    expect(win.show).toHaveBeenCalled()

    toggleLauncherWindow(win, screen, log)
    expect(win.hide).toHaveBeenCalled()
  })
})

describe('registerLauncherSummonShortcut', () => {
  it('logs a warning when registration fails', () => {
    const shortcuts = {
      register: mock(() => false),
      isRegistered: mock(() => false)
    }

    registerLauncherSummonShortcut(shortcuts, LAUNCHER_SUMMON_ACCELERATOR, () => undefined, log)

    expect(log.warn).toHaveBeenCalled()
  })

  it('logs success when registration succeeds', () => {
    const shortcuts = {
      register: mock(() => true),
      isRegistered: mock(() => true)
    }

    registerLauncherSummonShortcut(shortcuts, LAUNCHER_SUMMON_ACCELERATOR, () => undefined, log)

    expect(log.info).toHaveBeenCalledWith(`Global summon shortcut registered: ${LAUNCHER_SUMMON_ACCELERATOR}`, {
      active: true
    })
  })
})
