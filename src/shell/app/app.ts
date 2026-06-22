import { getLogger, type LogVerbosity } from '@shared/logging'
import type { ConfigPatch, ListOpts, OpenDialogOpts, TaskCreateInput, TaskUpdateInput } from '@shared/rpc'
import type { LoadedConfig } from './config/config.loader'
import type { AppShellHooks } from './lib/app_shell_hooks.types'
import type { TaskMutationLogContext } from './lib/app_task_source.service'
import type { RunSourceImportSyncTestHooks } from './lib/app_sync.service'
import { ConfigService } from './services/config.service'
import { LifecycleService, type SyncEmitter } from './services/lifecycle.service'
import { QueryService } from './services/query.service'
import { SyncService } from './services/sync.service'
import { TaskMutationService } from './services/task_mutation.service'

export type { SyncEmitter }

export class App {
  private readonly lifecycle: LifecycleService
  private readonly query: QueryService
  private readonly taskMutation: TaskMutationService
  private readonly syncService: SyncService
  private readonly config: ConfigService

  private get loaded(): LoadedConfig { return this.lifecycle.loaded }
  private set loaded(v: LoadedConfig) { this.lifecycle.loaded = v }
  private get syncGate() { return this.lifecycle.syncGate }
  private getDb() { return this.lifecycle.getDb() }
  getRawDbForTesting() { return this.lifecycle.getRawDbForTesting() }

  constructor(
    loaded: LoadedConfig,
    emit: SyncEmitter = {},
    _verbosity: LogVerbosity = 'default',
    shellHooks: AppShellHooks = {}
  ) {
    const log = getLogger(['kb', 'app'])
    this.lifecycle = new LifecycleService(loaded, emit, log)
    this.query = new QueryService(this.lifecycle, loaded)
    this.taskMutation = new TaskMutationService(this.lifecycle, this.query, loaded)
    this.syncService = new SyncService(this.lifecycle)
    this.config = new ConfigService(this.lifecycle, shellHooks)
  }

  list(opts: ListOpts = {}) { return this.query.list(opts) }
  listMatchCount(opts: ListOpts = {}) { return this.query.listMatchCount(opts) }
  getEntry(id: number) { return this.query.getEntry(id) }
  recordEntryVisit(id: number) { return this.query.recordEntryVisit(id) }
  listBindings() { return this.query.listBindings() }
  listBindingsByChord(hash: string) { return this.query.listBindingsByChord(hash) }
  recordBindingVisit(id: string, weight: number) { return this.query.recordBindingVisit(id, weight) }
  getListStats(filters: Partial<Pick<ListOpts, 'query' | 'tags' | 'types' | 'taskView'>> = {}) { return this.query.getListStats(filters) }
  getStats() { return this.query.getStats() }
  suggestTags(entryId: number) { return this.query.suggestTags(entryId) }

  sync(sourcesDir?: string, testHooks?: RunSourceImportSyncTestHooks) { return this.syncService.sync(sourcesDir, testHooks) }
  getSyncInfo() { return this.syncService.getSyncInfo() }

  getConfig() { return this.config.getConfig() }
  applyConfigPatch(patch: ConfigPatch) { return this.config.applyConfigPatch(patch) }

  createTask(input: TaskCreateInput, context?: TaskMutationLogContext) { return this.taskMutation.createTask(input, context) }
  updateTask(id: number, patch: TaskUpdateInput, context?: TaskMutationLogContext) { return this.taskMutation.updateTask(id, patch, context) }
  deleteTask(id: number, context?: TaskMutationLogContext) { return this.taskMutation.deleteTask(id, context) }
  cycleStatus(id: number, dir: 'forward' | 'backward', context?: TaskMutationLogContext) { return this.taskMutation.cycleStatus(id, dir, context) }
  cyclePriority(id: number, dir: 'forward' | 'backward', context?: TaskMutationLogContext) { return this.taskMutation.cyclePriority(id, dir, context) }
  reorderTask(id: number, dir: 'up' | 'down', context?: TaskMutationLogContext) { return this.taskMutation.reorderTask(id, dir, context) }

  openExternal(url: string) { return this.config.openExternal(url) }
  pasteInTerminal(cmd: string) { return this.config.pasteInTerminal(cmd) }
  runInTerminal(cmd: string) { return this.config.runInTerminal(cmd) }
  pasteDoc(doc: string) { return this.config.pasteDoc(doc) }
  openInEditor(filePath: string) { return this.config.openInEditor(filePath) }
  showOpenDialog(opts?: OpenDialogOpts) { return this.config.showOpenDialog(opts) }
  fetchPreviewImage(url: string) { return this.config.fetchPreviewImage(url) }
  resizeWindow(width: number, height: number) { return this.config.resizeWindow(width, height) }
  hideWindow() { return this.config.hideWindow() }
  getWindowPosition() { return this.config.getWindowPosition() }
  setWindowPosition(x: number, y: number) { return this.config.setWindowPosition(x, y) }
  quit() { return this.config.quit() }
}
