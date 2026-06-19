import type { Display } from 'electrobun/bun'
import {
  computeInitialFrameFromDisplay,
  MAIN_WINDOW_DEFAULT_SIZE,
  type MainWindowLike
} from '../utils/shell_hooks.util'
import { adaptFrameForNativeWindow } from './darwin_window_frame.util'
import { ensureWindowFrame, resolveDisplayForPlacement } from './placement.util'

/** LogTape string + props logger (also satisfied by test mocks). */
export type LauncherPresentLog = {
  debug: (message: string, properties?: Record<string, unknown>) => void
  info: (message: string, properties?: Record<string, unknown>) => void
}

export type LauncherShortcutLog = {
  warn: (message: string, properties?: Record<string, unknown>) => void
  info: (message: string, properties?: Record<string, unknown>) => void
}

/** Global summon chord (⌘⌥/ on macOS, Ctrl⌥/ elsewhere). */
export const LAUNCHER_SUMMON_ACCELERATOR = 'CommandOrControl+Alt+/' as const

export type LauncherWindow = MainWindowLike & {
  hide: () => void
  show: () => void
  activate: () => void
  setFrame: (x: number, y: number, width: number, height: number) => void
  getFrame?: () => { x: number; y: number; width: number; height: number }
  setAlwaysOnTop: (alwaysOnTop: boolean) => void
  setVisibleOnAllWorkspaces: (visible: boolean) => void
}

export type ScreenLike = {
  getCursorScreenPoint: () => { x: number; y: number }
  getAllDisplays: () => Display[]
  getPrimaryDisplay: () => Display
}

export type GlobalShortcutLike = {
  register: (accelerator: string, callback: () => void) => boolean
  isRegistered: (accelerator: string) => boolean
}

export type PresentLauncherOptions = {
  /** Prevents blur-to-hide while focus returns to Raycast / Terminal after summon. */
  armBlurGuard?: () => void
  platform?: NodeJS.Platform
}

/** Tracks whether the launcher panel is currently raised. */
let launcherRaised = false

export function isLauncherDismissed(): boolean {
  return !launcherRaised
}

/**
 * Center the launcher on the **primary display** and raise it as a floating panel.
 *
 * Placement follows the Electrobun Utils Screen example: center within
 * `primary.workArea`, then pass the frame to `BrowserWindow.setFrame`.
 */
export function presentLauncherWindow(
  win: LauncherWindow,
  screen: ScreenLike,
  log: LauncherPresentLog,
  options: PresentLauncherOptions = {}
): void {
  const primary = resolveDisplayForPlacement(screen)
  const screenFrame = ensureWindowFrame(
    computeInitialFrameFromDisplay(primary, log, MAIN_WINDOW_DEFAULT_SIZE),
    MAIN_WINDOW_DEFAULT_SIZE
  )
  const platform = options.platform ?? process.platform
  const nativeFrame = adaptFrameForNativeWindow(screenFrame, platform, primary, primary)
  log.info(
    `launcher present primary=${primary.id} screen=${screenFrame.x},${screenFrame.y} native=${nativeFrame.x},${nativeFrame.y} ${screenFrame.width}x${screenFrame.height} work=${primary.workArea.x},${primary.workArea.y} ${primary.workArea.width}x${primary.workArea.height}`,
    { primaryId: primary.id, bounds: primary.bounds, workArea: primary.workArea, screenFrame, nativeFrame }
  )

  options.armBlurGuard?.()

  win.setAlwaysOnTop(true)
  win.setVisibleOnAllWorkspaces(true)
  win.setFrame(nativeFrame.x, nativeFrame.y, screenFrame.width, screenFrame.height)
  win.show()
  win.activate()

  launcherRaised = true
}

/** Tuck the launcher away without quitting the agent process. */
export function dismissLauncherWindow(win: Pick<LauncherWindow, 'setAlwaysOnTop' | 'hide'>): void {
  win.setAlwaysOnTop(false)
  win.hide()
  launcherRaised = false
}

export function toggleLauncherWindow(
  win: LauncherWindow,
  screen: ScreenLike,
  log: LauncherPresentLog,
  options: PresentLauncherOptions = {}
): void {
  if (isLauncherDismissed()) {
    presentLauncherWindow(win, screen, log, options)
    return
  }
  dismissLauncherWindow(win)
}

export function registerLauncherSummonShortcut(
  shortcuts: GlobalShortcutLike,
  accelerator: string,
  onSummon: () => void,
  log: LauncherShortcutLog
): void {
  const registered = shortcuts.register(accelerator, onSummon)
  if (!registered) {
    log.warn(
      `Global shortcut ${accelerator} was not registered (already in use or OS denied). ` +
        'Grant Accessibility and Input Monitoring for kb in System Settings, check for conflicts with Raycast or other apps, then restart kb.'
    )
    return
  }
  log.info(`Global summon shortcut registered: ${accelerator}`, { active: shortcuts.isRegistered(accelerator) })
}

/** Test-only reset for module-level launcher state. */
export function resetLauncherWindowStateForTests(): void {
  launcherRaised = false
}
