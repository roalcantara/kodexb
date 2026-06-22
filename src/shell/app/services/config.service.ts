import type { ConfigPatch, OpenDialogOpts, PreviewImageResult, RpcGetConfigPayload } from '@shared/rpc'
import { saveConfig } from '../config/config.loader'
import { fetchPreviewImageFromUrl } from '../lib/preview/fetch.client'
import type { AppShellHooks } from '../lib/shell/shell_hooks.types'
import { createAppShellDelegates } from '../lib/shell/surface.util'
import type { LifecycleService } from './lifecycle.service'

export class ConfigService {
  private readonly shellDelegates: ReturnType<typeof createAppShellDelegates>

  constructor(
    private readonly lifecycle: LifecycleService,
    shellHooks: AppShellHooks = {}
  ) {
    this.shellDelegates = createAppShellDelegates(shellHooks, () => this.lifecycle.loaded)
  }

  getConfig(): Promise<RpcGetConfigPayload> {
    return Promise.resolve({
      configPath: this.lifecycle.loaded.configPath,
      database: { path: this.lifecycle.loaded.database.path },
      sources: { path: this.lifecycle.loaded.sources.path },
      display: { ...this.lifecycle.loaded.display }
    })
  }

  async applyConfigPatch(patch: ConfigPatch): Promise<RpcGetConfigPayload> {
    const pageSizeStr = patch.pageSize === undefined ? undefined : String(patch.pageSize)
    this.lifecycle.loaded = await saveConfig(this.lifecycle.loaded, {
      sourcesDir: patch.sourcesDir,
      dbPath: patch.dbPath,
      terminalApp: patch.terminalApp,
      editorApp: patch.editorApp,
      pageSize: pageSizeStr
    })
    if (patch.dbPath !== undefined) {
      this.lifecycle.closeDb()
    }
    this.lifecycle.invalidateListCache()
    return this.getConfig()
  }

  openExternal(url: string): Promise<void> {
    return this.shellDelegates.openExternal(url)
  }

  pasteInTerminal(cmd: string): Promise<void> {
    return this.shellDelegates.pasteInTerminal(cmd)
  }

  runInTerminal(cmd: string): Promise<void> {
    return this.shellDelegates.runInTerminal(cmd)
  }

  pasteDoc(doc: string): Promise<void> {
    return this.shellDelegates.pasteDoc(doc)
  }

  openInEditor(filePath: string): Promise<void> {
    return this.shellDelegates.openInEditor(filePath)
  }

  showOpenDialog(opts?: OpenDialogOpts): Promise<string | null> {
    return this.shellDelegates.showOpenDialog(opts)
  }

  fetchPreviewImage(url: string): Promise<PreviewImageResult | null> {
    return fetchPreviewImageFromUrl(url)
  }

  resizeWindow(width: number, height: number): Promise<void> {
    return this.shellDelegates.resizeWindow(width, height)
  }

  hideWindow(): Promise<void> {
    return this.shellDelegates.hideWindow()
  }

  getWindowPosition(): Promise<{ x: number; y: number } | null> {
    return this.shellDelegates.getWindowPosition()
  }

  setWindowPosition(x: number, y: number): Promise<void> {
    return this.shellDelegates.setWindowPosition(x, y)
  }

  quit(): Promise<void> {
    return this.shellDelegates.quit()
  }
}
