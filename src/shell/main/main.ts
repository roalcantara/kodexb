import { configureMainLogging, getLogger, parseLogVerbosity } from '@shared/logging'
import { BrowserWindow, GlobalShortcut, Screen, Utils } from 'electrobun/bun'
import { App } from '../app/app'
import { loadConfig } from '../app/config/config.loader'
import { reportConfigLoadErrorAndExit } from './helpers/error.helper'
import { createSyncEmitter, createWebviewRpc } from './rpc/host'
import { createRpcServer } from './rpc/server'
import {
  buildBrowserWindowCreateOptions,
  computeInitialFrameFromDisplay,
  createDeferredSyncEmit,
  createShellHooks,
  MAIN_WINDOW_DEFAULT_SIZE
} from './shell_hooks.util'

type WebviewRpc = ReturnType<typeof createWebviewRpc>

/**
 * Bootstrap the main window.
 */
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

  const shellHooks = {
    ...createShellHooks(() => win, {
      openExternal: url => Utils.openExternal(url),
      openFileDialog: opts => Utils.openFileDialog(opts)
    }),
    quit: () => {
      Utils.quit()
    }
  }
  const lateEmit = createDeferredSyncEmit(() => webviewRpc, createSyncEmitter)

  const app = new App(config, lateEmit, verbosity, shellHooks)
  const rpcApp = createRpcServer(app)
  webviewRpc = createWebviewRpc(rpcApp)

  // The main window loads trusted packaged renderer content at views://shell/index.html (bundled by Electrobun, no external origin).
  // Any future external or third-party webview must use sandbox: true,
  // partition isolation, and navigation allowlists per assets/guides/ELECTROBUN.md and electrobun-best-practices.
  const mainWin = new BrowserWindow(
    buildBrowserWindowCreateOptions(
      computeInitialFrameFromDisplay(Screen.getPrimaryDisplay(), logger, MAIN_WINDOW_DEFAULT_SIZE),
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

  /**
   * Minimize the main window when it loses focus.
   */
  mainWin.on('blur', () => {
    mainWin.minimize()
  })
}

await bootstrap()
