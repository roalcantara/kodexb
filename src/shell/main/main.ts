import { createLogger } from '@shared/logging'
import { BrowserWindow, Utils } from 'electrobun/bun'
import { App, type AppShellHooks, type SyncEmitter } from '../app/app'
import { loadConfig } from '../app/config/config.loader'
import { reportConfigLoadErrorAndExit } from './helpers/error.helper'
import { createKbWebviewRpc, createSyncEmitter } from './rpc/host'
import { createRpcServer } from './rpc/server'
import { loadWindowStateSync, saveWindowState, validateBounds, windowStatePathForConfigFile } from './window/state'

const DEFAULT_FRAME = { x: 100, y: 100, width: 820, height: 600 }

async function bootstrap() {
  const log = createLogger({ debug: false })

  const config = await loadConfig().catch(async err => {
    await reportConfigLoadErrorAndExit(err, {
      showMessageBox: Utils.showMessageBox,
      exit: Utils.quit,
      logError: e => log.error([e])
    })
    throw err
  })

  const persisted = loadWindowStateSync(config.configPath)
  const frame = persisted && validateBounds(persisted) ? persisted : DEFAULT_FRAME

  // Forward declarations so emit / shellHooks can reach the window + rpc once
  // construction completes. `BrowserWindow` must be the last thing created so
  // Electrobun attaches the transport to `kbWebviewRpc` after the handler is
  // already wired.
  let kbWebviewRpc: ReturnType<typeof createKbWebviewRpc> | null = null
  let win: BrowserWindow<ReturnType<typeof createKbWebviewRpc>> | null = null

  const lateEmit: SyncEmitter = {
    syncProgress: (processed, total) => {
      if (kbWebviewRpc) createSyncEmitter(kbWebviewRpc).syncProgress(processed, total)
    },
    syncComplete: result => {
      if (kbWebviewRpc) createSyncEmitter(kbWebviewRpc).syncComplete(result)
    }
  }

  const shellHooks: AppShellHooks = {
    resizeWindow: (width, height) => {
      win?.setSize(width, height)
    },
    openExternal: url => {
      Utils.openExternal(url)
    },
    showOpenDialog: async opts => {
      const properties = opts?.properties ?? []
      const canChooseDirectory = properties.includes('openDirectory')
      const canChooseFiles = properties.length === 0 || properties.includes('openFile')
      const paths = await Utils.openFileDialog({
        startingFolder: opts?.defaultPath,
        canChooseFiles,
        canChooseDirectory,
        allowsMultipleSelection: false
      })
      return paths[0] ?? null
    }
  }

  const app = new App(config, lateEmit, false, shellHooks)
  const rpcApp = createRpcServer(app)
  kbWebviewRpc = createKbWebviewRpc(rpcApp)

  win = new BrowserWindow({
    title: 'kb',
    url: 'views://shell/index.html',
    frame,
    rpc: kbWebviewRpc
  })

  win.show()
  win.activate()

  win.on('close', () => {
    if (!win) return
    const f = win.frame
    if (validateBounds(f)) {
      saveWindowState(config.configPath, f).catch(err => {
        log.error(['Failed to persist window state', err, windowStatePathForConfigFile(config.configPath)])
      })
    }
  })
}

await bootstrap()
