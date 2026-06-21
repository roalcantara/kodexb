import type { Display } from 'electrobun/bun'
import {
  computeInitialFrameFromDisplay,
  MAIN_WINDOW_DEFAULT_SIZE,
  type MainWindowLike
} from '../utils/shell_hooks.util'
import { appendLauncherProbe, isLauncherProbeEnabled } from './launcher_frame_probe.adapter'
import { ensureWindowFrame, resolveDisplayAtCursor, resolveDisplayForPlacement } from './placement.util'

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
 * Center the launcher on the **display under the cursor** and raise it as a
 * floating panel.
 *
 * Placement follows the Electrobun Utils Screen example: center within the
 * cursor display's `workArea`, realize the window with `show()`, then pass
 * **screen coordinates** to `setFrame` (no native Y-flip after realize).
 */
export function presentLauncherWindow(
  win: LauncherWindow,
  screen: ScreenLike,
  log: LauncherPresentLog,
  options: PresentLauncherOptions = {}
): void {
  const primary = resolveDisplayForPlacement(screen)
  const target = resolveDisplayAtCursor(screen)
  const screenFrame = ensureWindowFrame(
    computeInitialFrameFromDisplay(target, log, MAIN_WINDOW_DEFAULT_SIZE),
    MAIN_WINDOW_DEFAULT_SIZE
  )
  const { width, height } = MAIN_WINDOW_DEFAULT_SIZE

  log.info(
    `launcher present target=${target.id} primary=${primary.id} screen=${screenFrame.x},${screenFrame.y} ${screenFrame.width}x${screenFrame.height} work=${target.workArea.x},${target.workArea.y} ${target.workArea.width}x${target.workArea.height}`,
    {
      targetId: target.id,
      primaryId: primary.id,
      bounds: target.bounds,
      workArea: target.workArea,
      screenFrame
    }
  )

  options.armBlurGuard?.()

  win.setAlwaysOnTop(true)
  win.setVisibleOnAllWorkspaces(true)
  win.setSize(width, height)
  win.show()
  win.activate()
  win.setFrame(screenFrame.x, screenFrame.y, screenFrame.width, screenFrame.height)
  win.setSize(width, height)

  const readback = win.getFrame?.() ?? null
  if (readback) {
    log.debug(`launcher frame readback x=${readback.x} y=${readback.y} ${readback.width}x${readback.height}`, {
      readback
    })
  }

  if (isLauncherProbeEnabled()) {
    appendLauncherProbe({
      ts: new Date().toISOString(),
      event: 'present',
      cursor: screen.getCursorScreenPoint(),
      displays: screen.getAllDisplays().map(d => ({
        id: d.id,
        bounds: d.bounds,
        workArea: d.workArea
      })),
      targetId: target.id,
      primaryId: primary.id,
      screenFrame,
      setFrameArgs: screenFrame,
      setSizeBefore: { width, height },
      setSizeAfter: { width, height },
      readback
    })
  }

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
