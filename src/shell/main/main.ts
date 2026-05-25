import { BrowserWindow, GlobalShortcut, Screen, Utils } from 'electrobun/bun'
import { createLogger, parseKbLogVerbosity } from '../../shared/logging'
import { App } from '../app/app'
import { loadConfig } from '../app/config/config.loader'
import { reportConfigLoadErrorAndExit } from './helpers/error.helper'
import {
  buildBrowserWindowCreateOptions,
  computeInitialFrameFromDisplay,
  createKbLateEmit,
  createKbShellHooks,
  MAIN_WINDOW_DEFAULT_SIZE
} from './kb_shell_hooks.util'
import { createKbWebviewRpc, createSyncEmitter } from './rpc/host'
import { createRpcServer } from './rpc/server'

type KbWebviewRpc = ReturnType<typeof createKbWebviewRpc>

/**
 * Bootstrap the main window.
 */
async function bootstrap() {
  const verbosity = parseKbLogVerbosity()
  const logger = createLogger({ verbosity })
  const config = await loadConfig().catch(async err => {
    await reportConfigLoadErrorAndExit(err, {
      showMessageBox: Utils.showMessageBox,
      exit: Utils.quit,
      logError: e => logger.error([e])
    })
    throw err
  })

  let kbWebviewRpc: KbWebviewRpc | null = null
  let win: BrowserWindow<KbWebviewRpc> | null = null

  const shellHooks = {
    ...createKbShellHooks(() => win, {
      openExternal: url => Utils.openExternal(url),
      openFileDialog: opts => Utils.openFileDialog(opts)
    }),
    quit: () => {
      Utils.quit()
    }
  }
  const lateEmit = createKbLateEmit(() => kbWebviewRpc, createSyncEmitter)

  const app = new App(config, lateEmit, verbosity, shellHooks)
  const rpcApp = createRpcServer(app)
  kbWebviewRpc = createKbWebviewRpc(rpcApp)

  // The main window loads trusted packaged renderer content at views://shell/index.html (bundled by Electrobun, no external origin).
  // Any future external or third-party webview must use sandbox: true,
  // partition isolation, and navigation allowlists per assets/guides/ELECTROBUN.md and electrobun-best-practices.
  const mainWin = new BrowserWindow(
    buildBrowserWindowCreateOptions(
      computeInitialFrameFromDisplay(Screen.getPrimaryDisplay(), logger, MAIN_WINDOW_DEFAULT_SIZE),
      kbWebviewRpc,
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
