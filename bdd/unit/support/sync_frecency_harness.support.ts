import fs, { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deriveId } from '@core/domain/models/knowledges/factories/knowledge.factory'
import { App } from '../../../src/shell/app/app'
import type { LoadedConfig } from '../../../src/shell/app/config/config.loader'
import { ImportService } from '../../../src/shell/app/db/import.service'

export { deriveId }

export const FREQUENT_KEY = 'https://frequent.example'
export const RARE_KEY = 'https://rare.example'
export const GIT_STATUS_KEY = 'git status'

export const BASE_ENTRIES_YML = `bookmarks:
  ${FREQUENT_KEY}:
    desc: Frequent entry
    tags: [test]
  ${RARE_KEY}:
    desc: Rare entry
    tags: [test]
commands:
  ${GIT_STATUS_KEY}:
    desc: Git status
    tags: [git]
`

export type SyncHarness = {
  workDir: string
  sourcesDir: string
  app: App
}

let activeHarness: SyncHarness | undefined

export function getActiveSyncHarness(): SyncHarness {
  if (!activeHarness) throw new Error('sync harness not initialized')
  return activeHarness
}

export async function disposeActiveSyncHarness(): Promise<void> {
  if (activeHarness) {
    await rm(activeHarness.workDir, { recursive: true, force: true })
    activeHarness = undefined
  }
}

async function writeSources(sourcesDir: string, files: Record<string, string>): Promise<void> {
  await Promise.all(
    Object.entries(files).map(([name, content]) => fs.writeFile(join(sourcesDir, name), content, 'utf-8'))
  )
}

export async function createSyncHarness(initialFiles: Record<string, string>): Promise<SyncHarness> {
  if (activeHarness) {
    throw new Error(
      'sync harness already active — a previous scenario may not have cleaned up. ' +
        'Ensure After hooks call disposeActiveSyncHarness().'
    )
  }
  await disposeActiveSyncHarness()
  const workDir = await mkdtemp(join(tmpdir(), 'kb-sync-frecency-'))
  const sourcesDir = join(workDir, 'sources')
  await fs.mkdir(sourcesDir, { recursive: true })
  await writeSources(sourcesDir, initialFiles)

  const loaded: LoadedConfig = {
    configPath: join(workDir, 'config.yaml'),
    database: { path: join(workDir, 'kb.sqlite') },
    sources: { path: sourcesDir },
    writeTarget: join(workDir, 'config.yaml'),
    display: { pageSize: '50' }
  }

  const importer = new ImportService(loaded.database.path)
  try {
    await importer.run(sourcesDir)
  } catch (err) {
    await rm(workDir, { recursive: true, force: true })
    throw err
  }

  activeHarness = { workDir, sourcesDir, app: new App(loaded) }
  return activeHarness
}

export async function listKeys(app: App, limit = 20): Promise<string[]> {
  return app.list({ limit }).then(rows => rows.map(row => row.key))
}

export function appRawDb(app: App) {
  return app.getRawDbForTesting()
}

export function frecencyScore(app: App, entryId: number): number {
  const row = appRawDb(app)
    .query<{ frecency_score: number }, [number]>('SELECT frecency_score FROM entry_frecency WHERE entry_id = ?')
    .get(entryId)
  return row?.frecency_score ?? 0
}

export function entryIds(app: App): { frequentId: number; rareId: number; gitId: number } {
  return {
    frequentId: deriveId('bookmark', FREQUENT_KEY),
    rareId: deriveId('bookmark', RARE_KEY),
    gitId: deriveId('command', GIT_STATUS_KEY)
  }
}

export const SHORTCUTS_YML = `shortcuts:
  my-app:
    desc: My app shortcuts
    tags: [test]
    bindings:
      - chord: cmd+p
        action: Go to File
        scope: local
      - chord: cmd+k
        action: Command Palette
        scope: local
`

export const GO_TO_FILE_BINDING_ID = 'my-app:go-to-file'
export const COMMAND_PALETTE_BINDING_ID = 'my-app:command-palette'

export async function updateSources(files: Record<string, string>): Promise<void> {
  if (!activeHarness) throw new Error('sync harness not initialized')
  await writeSources(activeHarness.sourcesDir, files)
}

export function bindingScoreFor(app: App, bindingId: string): number {
  const row = appRawDb(app)
    .query<{ score: number }, [string]>('SELECT score FROM binding_frecency WHERE binding_id = ?')
    .get(bindingId)
  return row?.score ?? 0
}

export async function prepareFrequentVisitHarness(initialFiles: Record<string, string>) {
  const h = await createSyncHarness(initialFiles)
  const frequentId = deriveId('bookmark', FREQUENT_KEY)
  await h.app.recordEntryVisit(frequentId)
  await h.app.recordEntryVisit(frequentId)
  const scoreBefore = frecencyScore(h.app, frequentId)
  return { ...h, frequentId, scoreBefore }
}
