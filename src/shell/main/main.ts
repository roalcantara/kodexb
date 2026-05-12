import { BrowserWindow, Utils } from 'electrobun/bun'
import { createLogger } from '../../shared/logging'
import { App, type AppShellHooks, type SyncEmitter } from '../app/app'
import { loadConfig } from '../app/config/config.loader'
import { reportConfigLoadErrorAndExit } from './helpers/error.helper'
import { createKbWebviewRpc, createSyncEmitter } from './rpc/host'
import { createRpcServer } from './rpc/server'

const DEFAULT_WIDTH = 680
const DEFAULT_HEIGHT = 420

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

  let kbWebviewRpc: ReturnType<typeof createKbWebviewRpc> | null = null
  let win: BrowserWindow<ReturnType<typeof createKbWebviewRpc>> | null = null

  const hideWindow = () => {
    win?.hide()
  }

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
    hideWindow: () => {
      hideWindow()
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
    },
    pasteInTerminal: (_cmd, terminalApp) => {
      if (terminalApp) Utils.openExternal(terminalApp)
    },
    openInEditor: (filePath, _editorApp) => {
      const fileUrl = filePath.startsWith('/') ? `file://${filePath}` : filePath
      Utils.openExternal(fileUrl)
    }
  }

  const app = new App(config, lateEmit, false, shellHooks)
  const rpcApp = createRpcServer(app)
  kbWebviewRpc = createKbWebviewRpc(rpcApp)

  win = new BrowserWindow({
    title: 'kb',
    url: 'views://shell/index.html',
    frame: { x: 0, y: 0, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
    rpc: kbWebviewRpc
  })

  win.show()
  win.activate()

  win.on('blur', () => {
    hideWindow()
  })
}

await bootstrap()
