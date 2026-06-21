import { configureMainLogging, getLogger, parseLogVerbosity } from '@shared/logging'
import Electrobun, { BrowserWindow, GlobalShortcut, Screen, Utils } from 'electrobun/bun'
import { App } from '../app/app'
import { loadConfig } from '../app/config/config.loader'
import type { HandoffServices } from './handoff/registry.service'
import { runEntryHandoff } from './handoff/registry.service'
import { reportConfigLoadErrorAndExit } from './helpers/error.helper'
import { createSyncEmitter, createWebviewRpc } from './rpc/host'
import { createRpcServer } from './rpc/server'
import { registerBeforeQuitShortcutTeardown } from './utils/register_before_quit_shortcuts.util'
import {
  buildBrowserWindowCreateOptions,
  computeInitialFrameFromDisplay,
  createDeferredSyncEmit,
  createShellHooks,
  MAIN_WINDOW_DEFAULT_SIZE
} from './utils/shell_hooks.util'
import { createExternalFocusHandoff } from './window/external_focus_handoff.util'
import {
  dismissLauncherWindow,
  isLauncherDismissed,
  LAUNCHER_SUMMON_ACCELERATOR,
  presentLauncherWindow,
  registerLauncherSummonShortcut,
  toggleLauncherWindow
} from './window/launcher_window.util'
import {
  ensureWindowFrame,
  normalizeDisplay,
  resolveDisplayAtCursor,
  resolveDisplayForPlacement
} from './window/placement.util'

type WebviewRpc = ReturnType<typeof createWebviewRpc>

/**
 * Bootstrap the main window.
 */
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: pre-existing bootstrap function
async function bootstrap() {
  const verbosity = parseLogVerbosity()
  configureMainLogging()
  const logger = getLogger(['kb', 'main'])

  let webviewRpc: WebviewRpc | null = null
  let win: BrowserWindow<WebviewRpc> | null = null
  let pendingSummon = false

  const screenApi = () => ({
    getCursorScreenPoint: () => Screen.getCursorScreenPoint(),
    getAllDisplays: () => Screen.getAllDisplays(),
    getPrimaryDisplay: () => Screen.getPrimaryDisplay()
  })

  const focusHandoff = createExternalFocusHandoff({
    hide: () => {
      if (win) dismissLauncherWindow(win)
    },
    show: () => {
      requestSummon('handoff-show')
    }
  })

  const requestSummon = (reason: string, url?: string) => {
    logger.info(`summon requested (${reason})${url ? `: ${url}` : ''}`)
    pendingSummon = true
    if (win) {
      focusHandoff.armGuard()
      presentLauncherWindow(win, screenApi(), logger, { armBlurGuard: () => focusHandoff.armGuard() })
      pendingSummon = false
    }
  }

  if (process.platform === 'darwin') {
    // Register before async bootstrap work — cold-start `open "kb://…"` can emit open-url immediately.
    Electrobun.events.on('open-url', event => {
      requestSummon('open-url', event.data.url)
    })

    Electrobun.events.on('reopen', () => {
      requestSummon('reopen')
    })
  }

  const config = await loadConfig().catch(async err => {
    await reportConfigLoadErrorAndExit(err, {
      showMessageBox: Utils.showMessageBox,
      exit: Utils.quit,
      logError: e => logger.error(String(e))
    })
    throw err
  })

  const handoffServices: HandoffServices = {
    armGuard: () => focusHandoff.armGuard(),
    disarmGuard: () => focusHandoff.disarmGuard(),
    hide: () => {
      if (win) dismissLauncherWindow(win)
    },
    show: () => {
      requestSummon('handoff')
    }
  }

  const shellHooks = {
    ...createShellHooks(
      () => win,
      {
        openExternal: url => Utils.openExternal(url),
        openFileDialog: opts => Utils.openFileDialog(opts),
        openPath: path => Utils.openPath(path)
      },
      handoffServices,
      runEntryHandoff,
      process.platform === 'darwin'
        ? {
            platform: process.platform,
            windowHeight: MAIN_WINDOW_DEFAULT_SIZE.height,
            getDisplay: () => resolveDisplayAtCursor(screenApi()),
            getPrimaryDisplay: () => normalizeDisplay(Screen.getPrimaryDisplay())
          }
        : undefined
    ),
    hideWindow: () => {
      if (win) dismissLauncherWindow(win)
    },
    quit: () => Utils.quit()
  }
  const lateEmit = createDeferredSyncEmit(() => webviewRpc, createSyncEmitter)

  const app = new App(config, lateEmit, verbosity, shellHooks)
  const rpcApp = createRpcServer(app)
  webviewRpc = createWebviewRpc(rpcApp)

  // The main window loads trusted packaged renderer content at views://shell/index.html (bundled by Electrobun, no external origin).
  // Any future external or third-party webview must use sandbox: true,
  // partition isolation, and navigation allowlists per assets/guides/ELECTROBUN.md and electrobun-best-practices.
  const primaryDisplay = resolveDisplayForPlacement(screenApi())
  const initialScreenFrame = ensureWindowFrame(
    computeInitialFrameFromDisplay(primaryDisplay, logger, MAIN_WINDOW_DEFAULT_SIZE),
    MAIN_WINDOW_DEFAULT_SIZE
  )
  logger.debug('window create', { screenFrame: initialScreenFrame })

  const mainWin = new BrowserWindow(buildBrowserWindowCreateOptions(initialScreenFrame, webviewRpc, process.platform))
  win = mainWin

  if (pendingSummon) {
    focusHandoff.armGuard()
    presentLauncherWindow(mainWin, screenApi(), logger, {
      armBlurGuard: () => focusHandoff.armGuard(),
      platform: process.platform
    })
    pendingSummon = false
  }

  const presentOptions = { armBlurGuard: () => focusHandoff.armGuard(), platform: process.platform }

  if (process.platform === 'darwin') {
    registerLauncherSummonShortcut(
      GlobalShortcut,
      LAUNCHER_SUMMON_ACCELERATOR,
      () => toggleLauncherWindow(mainWin, screenApi(), logger, presentOptions),
      logger
    )

    mainWin.on('focus', () => {
      if (focusHandoff.shouldDeferBlurMinimize()) return
      if (isLauncherDismissed()) {
        presentLauncherWindow(mainWin, screenApi(), logger, presentOptions)
      }
    })
  } else {
    mainWin.show()
    mainWin.activate()

    registerLauncherSummonShortcut(
      GlobalShortcut,
      LAUNCHER_SUMMON_ACCELERATOR,
      () => toggleLauncherWindow(mainWin, screenApi(), logger, presentOptions),
      logger
    )
  }

  registerBeforeQuitShortcutTeardown(Electrobun.events, GlobalShortcut)

  /**
   * Minimize the launcher when it loses focus (Raycast / PowerToys dismiss pattern).
   */
  mainWin.on('blur', () => {
    if (focusHandoff.shouldDeferBlurMinimize()) return
    dismissLauncherWindow(mainWin)
  })
}

await bootstrap()
