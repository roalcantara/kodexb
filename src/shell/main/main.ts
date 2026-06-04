import { configureMainLogging, getLogger, parseLogVerbosity } from '@shared/logging'
import Electrobun, { BrowserWindow, GlobalShortcut, Screen, Utils } from 'electrobun/bun'
import { App } from '../app/app'
import { loadConfig } from '../app/config/config.loader'
import type { HandoffServices } from './handoff/handoff_registry.service'
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
import { findDisplayAtPoint } from './window/display_at_cursor.util'
import { createExternalFocusHandoff } from './window/external_focus_handoff.util'
import { resolveDisplayForPlacement } from './window/placement.util'

type WebviewRpc = ReturnType<typeof createWebviewRpc>

/**
 * Bootstrap the main window.
 */
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: pre-existing bootstrap function
async function bootstrap() {
  const verbosity = parseLogVerbosity()
  configureMainLogging()
  const logger = getLogger(['kb', 'main'])
  const config = await loadConfig().catch(async err => {
    await reportConfigLoadErrorAndExit(err, {
      showMessageBox: Utils.showMessageBox,
      exit: Utils.quit,
      logError: e => logger.error(String(e))
    })
    throw err
  })

  let webviewRpc: WebviewRpc | null = null
  let win: BrowserWindow<WebviewRpc> | null = null

  const focusHandoff = createExternalFocusHandoff({
    hide: () => win?.minimize(),
    show: () => win?.unminimize()
  })

  const handoffServices: HandoffServices = {
    armGuard: () => focusHandoff.armGuard(),
    disarmGuard: () => focusHandoff.disarmGuard(),
    hide: () => win?.minimize(),
    show: () => win?.unminimize()
  }

  const shellHooks = {
    ...createShellHooks(
      () => win,
      {
        openExternal: url => Utils.openExternal(url),
        openFileDialog: opts => Utils.openFileDialog(opts),
        openPath: path => Utils.openPath(path)
      },
      handoffServices
    ),
    quit: () => Utils.quit()
  }
  const lateEmit = createDeferredSyncEmit(() => webviewRpc, createSyncEmitter)

  const app = new App(config, lateEmit, verbosity, shellHooks)
  const rpcApp = createRpcServer(app)
  webviewRpc = createWebviewRpc(rpcApp)

  // The main window loads trusted packaged renderer content at views://shell/index.html (bundled by Electrobun, no external origin).
  // Any future external or third-party webview must use sandbox: true,
  // partition isolation, and navigation allowlists per assets/guides/ELECTROBUN.md and electrobun-best-practices.
  const resolvedDisplay = resolveDisplayForPlacement(
    {
      getCursorScreenPoint: () => Screen.getCursorScreenPoint(),
      getAllDisplays: () => Screen.getAllDisplays(),
      getPrimaryDisplay: () => Screen.getPrimaryDisplay()
    },
    findDisplayAtPoint
  )
  const mainWin = new BrowserWindow(
    buildBrowserWindowCreateOptions(
      computeInitialFrameFromDisplay(resolvedDisplay, logger, MAIN_WINDOW_DEFAULT_SIZE),
      webviewRpc,
      process.platform
    )
  )
  win = mainWin

  mainWin.show()
  mainWin.activate()

  /**
   * Toggle minimize — must match `hideWindow` (Escape) which uses `minimize()`, not `hide()`.
   */
  GlobalShortcut.register('CommandOrControl+Alt+/', () => {
    if (!win) return
    if (win.isMinimized()) {
      win.unminimize()
      win.show()
      win.activate()
    } else {
      win.minimize()
    }
  })

  registerBeforeQuitShortcutTeardown(Electrobun.events, GlobalShortcut)

  /**
   * Minimize the main window when it loses focus.
   */
  mainWin.on('blur', () => {
    mainWin.minimize()
  })
}

await bootstrap()
