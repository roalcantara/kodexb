import { BrowserWindow, GlobalShortcut, Screen, Utils } from 'electrobun/bun'
import { createLogger } from '../../shared/logging'
import type { RpcSyncProgressPayload } from '../../shared/rpc'
import { App, type AppShellHooks, type SyncEmitter } from '../app/app'
import { loadConfig } from '../app/config/config.loader'
import { reportConfigLoadErrorAndExit } from './helpers/error.helper'
import { createKbWebviewRpc, createSyncEmitter } from './rpc/host'
import { createRpcServer } from './rpc/server'
import { isUsableWorkArea, resolveInitialFrame } from './window/placement.util'

const DEFAULT_WIDTH = 680
const DEFAULT_HEIGHT = 420

function computeInitialFrame(log: ReturnType<typeof createLogger>) {
  const primary = Screen.getPrimaryDisplay()
  if (!isUsableWorkArea(primary?.workArea)) {
    log.debug(['window placement: primary display work area unavailable; using safe fallback (100,100)'])
  }
  return resolveInitialFrame(primary, { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
}

type KbWebviewRpc = ReturnType<typeof createKbWebviewRpc>

function createKbLateEmit(getKbRpc: () => KbWebviewRpc | null): SyncEmitter {
  return {
    syncProgress: (payload: RpcSyncProgressPayload) => {
      const rpc = getKbRpc()
      if (rpc) createSyncEmitter(rpc).syncProgress(payload)
    },
    syncComplete: result => {
      const rpc = getKbRpc()
      if (rpc) createSyncEmitter(rpc).syncComplete(result)
    }
  }
}

function createKbShellHooks(getWin: () => BrowserWindow<KbWebviewRpc> | null): AppShellHooks {
  return {
    resizeWindow: (width, height) => {
      getWin()?.setSize(width, height)
    },
    hideWindow: () => {
      getWin()?.hide()
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
}

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

  let kbWebviewRpc: KbWebviewRpc | null = null
  let win: BrowserWindow<KbWebviewRpc> | null = null

  const shellHooks: AppShellHooks = {
    ...createKbShellHooks(() => win),
    quit: () => {
      Utils.quit()
    }
  }
  const lateEmit = createKbLateEmit(() => kbWebviewRpc)

  const app = new App(config, lateEmit, false, shellHooks)
  const rpcApp = createRpcServer(app)
  kbWebviewRpc = createKbWebviewRpc(rpcApp)

  const isDarwin = process.platform === 'darwin'
  win = new BrowserWindow({
    title: 'kb',
    url: 'views://shell/index.html',
    frame: computeInitialFrame(log),
    titleBarStyle: isDarwin ? 'hidden' : 'default',
    transparent: true,
    rpc: kbWebviewRpc
  })

  win.show()
  win.activate()

  let windowVisible = true

  GlobalShortcut.register('CommandOrControl+Alt+/', () => {
    if (!win) return
    if (windowVisible) {
      win.hide()
      windowVisible = false
    } else {
      win.show()
      win.activate()
      windowVisible = true
    }
  })

  win.on('blur', () => {
    win?.minimize()
  })
}

await bootstrap()
