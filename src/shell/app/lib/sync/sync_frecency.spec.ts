// @sync_frecency_preserve
import { afterEach, describe, expect, it } from 'bun:test'
import fs, { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deriveId } from '@core/domain/models/knowledges/factories/knowledge.factory'
import { factoryFor } from '@testing'
import { App } from '../../app'
import type { LoadedConfig } from '../../config/config.loader'
import { getBindingScore } from '../../db/binding_frecency.repository'
import { ImportService } from '../../db/import.service'

const FREQUENT_KEY = 'https://frequent.example'
const RARE_KEY = 'https://rare.example'
const GIT_STATUS_KEY = 'git status'

const BASE_ENTRIES_YML = `bookmarks:
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

const SHORTCUTS_YML = `shortcuts:
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

const GO_TO_FILE_BINDING_ID = 'my-app:go-to-file'
const COMMAND_PALETTE_BINDING_ID = 'my-app:command-palette'

type SyncHarness = {
  workDir: string
  sourcesDir: string
  loaded: LoadedConfig
  app: App
}

let harness: SyncHarness | undefined

afterEach(async () => {
  if (harness !== undefined) {
    await rm(harness.workDir, { recursive: true, force: true })
    harness = undefined
  }
})

async function writeSources(sourcesDir: string, files: Record<string, string>): Promise<void> {
  await Promise.all(
    Object.entries(files).map(([name, content]) => fs.writeFile(join(sourcesDir, name), content, 'utf-8'))
  )
}

async function createSyncHarness(initialFiles: Record<string, string>): Promise<SyncHarness> {
  const workDir = await mkdtemp(join(tmpdir(), 'kb-sync-frecency-'))
  const sourcesDir = join(workDir, 'sources')
  await fs.mkdir(sourcesDir, { recursive: true })
  await writeSources(sourcesDir, initialFiles)

  const loaded = factoryFor('loadedConfig', {
    overrides: {
      configPath: join(workDir, 'config.yaml'),
      database: { path: join(workDir, 'kb.sqlite') },
      sources: { path: sourcesDir }
    }
  })

  const importer = new ImportService(loaded.database.path)
  await importer.run(sourcesDir)

  return { workDir, sourcesDir, loaded, app: new App(loaded) }
}

function listKeys(app: App, limit = 20): Promise<string[]> {
  return app.list({ limit }).then(rows => rows.map(row => row.key))
}

function appRawDb(app: App) {
  return (app as unknown as { getDb: () => { raw: Parameters<typeof getBindingScore>[0] } }).getDb().raw
}

async function seedTwoEntryVisitsAndScore(app: App, entryId: number): Promise<number> {
  await app.recordEntryVisit(entryId)
  await app.recordEntryVisit(entryId)
  return frecencyScore(app, entryId)
}

async function prepareFrequentVisitHarness(initialFiles: Record<string, string>) {
  harness = await createSyncHarness(initialFiles)
  const frequentId = deriveId('bookmark', FREQUENT_KEY)
  const scoreBefore = await seedTwoEntryVisitsAndScore(harness.app, frequentId)
  return { ...harness, frequentId, scoreBefore }
}

function frecencyScore(app: App, entryId: number): number {
  const row = appRawDb(app)
    .query<{ frecency_score: number }, [number]>('SELECT frecency_score FROM entry_frecency WHERE entry_id = ?')
    .get(entryId)
  return row?.frecency_score ?? 0
}

describe('App.sync frecency preserve', () => {
  describe('SF-1 entry usage survives sync', () => {
    it('preserves relative list order for surviving entries', async () => {
      harness = await createSyncHarness({ 'entries.yml': BASE_ENTRIES_YML })
      const { app } = harness

      const frequentId = deriveId('bookmark', FREQUENT_KEY)
      const rareId = deriveId('bookmark', RARE_KEY)
      const gitId = deriveId('command', GIT_STATUS_KEY)

      await app.recordEntryVisit(frequentId)
      await app.recordEntryVisit(frequentId)
      await app.recordEntryVisit(frequentId)
      await app.recordEntryVisit(rareId)

      const orderBefore = await listKeys(app)
      await app.sync(harness.sourcesDir)
      const orderAfter = await listKeys(app)

      expect(orderAfter).toEqual(orderBefore)
      expect(frecencyScore(app, frequentId)).toBeGreaterThan(frecencyScore(app, rareId))
      expect(frecencyScore(app, gitId)).toBe(0)
    })

    it('drops removed entries and keeps remaining order', async () => {
      harness = await createSyncHarness({ 'entries.yml': BASE_ENTRIES_YML })
      const { app, sourcesDir } = harness

      const frequentId = deriveId('bookmark', FREQUENT_KEY)
      const rareId = deriveId('bookmark', RARE_KEY)

      await app.recordEntryVisit(frequentId)
      await app.recordEntryVisit(frequentId)
      await app.recordEntryVisit(rareId)

      const orderBefore = (await listKeys(app)).filter(key => key !== RARE_KEY)

      await writeSources(sourcesDir, {
        'entries.yml': BASE_ENTRIES_YML.replace(`  ${RARE_KEY}:\n    desc: Rare entry\n    tags: [test]\n`, '')
      })
      await app.sync(sourcesDir)

      const orderAfter = await listKeys(app)
      expect(orderAfter).not.toContain(RARE_KEY)
      expect(orderAfter).toEqual(orderBefore)
      expect(frecencyScore(app, rareId)).toBe(0)
      expect(frecencyScore(app, frequentId)).toBeGreaterThan(0)
    })

    it('skipLearnedRestore rebuilds without learned rows', async () => {
      harness = await createSyncHarness({ 'entries.yml': BASE_ENTRIES_YML })
      const { app } = harness
      const frequentId = deriveId('bookmark', FREQUENT_KEY)

      await app.recordEntryVisit(frequentId)
      await app.recordEntryVisit(frequentId)
      await app.sync(harness.sourcesDir, { skipLearnedRestore: true })

      expect(frecencyScore(app, frequentId)).toBe(0)
    })

    it('ranks new entries below frequently visited items until first open', async () => {
      harness = await createSyncHarness({ 'entries.yml': BASE_ENTRIES_YML })
      const { app, sourcesDir } = harness

      const frequentId = deriveId('bookmark', FREQUENT_KEY)
      const newKey = 'https://new.example'

      await app.recordEntryVisit(frequentId)
      await app.recordEntryVisit(frequentId)
      await app.recordEntryVisit(frequentId)

      await writeSources(sourcesDir, {
        'entries.yml': BASE_ENTRIES_YML.replace(
          `${RARE_KEY}:\n    desc: Rare entry\n    tags: [test]\n`,
          `${RARE_KEY}:\n    desc: Rare entry\n    tags: [test]\n  ${newKey}:\n    desc: Brand new entry\n    tags: [test]\n`
        )
      })
      await app.sync(sourcesDir)

      const orderAfterSync = await listKeys(app)
      const newIndex = orderAfterSync.indexOf(newKey)
      const frequentIndex = orderAfterSync.indexOf(FREQUENT_KEY)
      expect(newIndex).toBeGreaterThan(frequentIndex)

      const newId = deriveId('bookmark', newKey)
      expect(frecencyScore(app, newId)).toBe(0)

      await app.recordEntryVisit(newId)
      expect(frecencyScore(app, newId)).toBeGreaterThan(0)
    })
  })

  describe('SF-2 binding usage survives sync', () => {
    it('preserves binding scores for surviving shortcuts', async () => {
      harness = await createSyncHarness({
        'entries.yml': BASE_ENTRIES_YML,
        'shortcuts.yml': SHORTCUTS_YML
      })
      const { app } = harness

      await app.recordBindingVisit(GO_TO_FILE_BINDING_ID, 1.0)
      await app.recordBindingVisit(GO_TO_FILE_BINDING_ID, 1.0)
      await app.recordBindingVisit(COMMAND_PALETTE_BINDING_ID, 1.0)

      const scoreBefore = getBindingScore(appRawDb(app), GO_TO_FILE_BINDING_ID)

      await app.sync(harness.sourcesDir)

      const scoreAfter = getBindingScore(appRawDb(app), GO_TO_FILE_BINDING_ID)
      expect(scoreAfter).toBe(scoreBefore)
      expect(scoreAfter).toBeGreaterThan(getBindingScore(appRawDb(app), COMMAND_PALETTE_BINDING_ID))
    })

    it('drops removed bindings and keeps remaining shortcut scores', async () => {
      harness = await createSyncHarness({
        'entries.yml': BASE_ENTRIES_YML,
        'shortcuts.yml': SHORTCUTS_YML
      })
      const { app, sourcesDir } = harness

      await app.recordBindingVisit(GO_TO_FILE_BINDING_ID, 1.0)
      await app.recordBindingVisit(GO_TO_FILE_BINDING_ID, 1.0)
      await app.recordBindingVisit(COMMAND_PALETTE_BINDING_ID, 1.0)

      const paletteScoreBefore = getBindingScore(appRawDb(app), COMMAND_PALETTE_BINDING_ID)

      await writeSources(sourcesDir, {
        'entries.yml': BASE_ENTRIES_YML,
        'shortcuts.yml': SHORTCUTS_YML.replace(
          '      - chord: cmd+p\n        action: Go to File\n        scope: local\n',
          ''
        )
      })
      await app.sync(sourcesDir)

      const bindings = await app.listBindings()
      expect(bindings.some(binding => binding.bindingId === GO_TO_FILE_BINDING_ID)).toBe(false)
      expect(bindings.some(binding => binding.bindingId === COMMAND_PALETTE_BINDING_ID)).toBe(true)

      const db = appRawDb(app)
      expect(getBindingScore(db, GO_TO_FILE_BINDING_ID)).toBe(0)
      expect(getBindingScore(db, COMMAND_PALETTE_BINDING_ID)).toBe(paletteScoreBefore)
    })
  })

  describe('SF-3 source sync remains trustworthy', () => {
    it('reflects YAML edits while preserving entry frecency', async () => {
      const { app, sourcesDir, frequentId, scoreBefore } = await prepareFrequentVisitHarness({
        'entries.yml': BASE_ENTRIES_YML
      })

      await writeSources(sourcesDir, {
        'entries.yml': BASE_ENTRIES_YML.replace('Frequent entry', 'Updated frequent title')
      })
      await app.sync(sourcesDir)

      const entry = await app.getEntry(frequentId)
      expect(entry?.desc).toBe('Updated frequent title')
      expect(frecencyScore(app, frequentId)).toBe(scoreBefore)
    })

    it('restores usage after partial import via testHooks', async () => {
      const { app, sourcesDir, frequentId, scoreBefore } = await prepareFrequentVisitHarness({
        '01_entries.yml': BASE_ENTRIES_YML,
        '02_extra.yml': `cheats:
  Git basics:
    desc: Extra cheat sheet
    tags: [git]
`
      })
      const countBefore = await app.list({ limit: 50 }).then(rows => rows.length)

      const result = await app.sync(sourcesDir, { maxBundlesToProcess: 1 })

      expect(result.filesProcessed).toBe(1)
      const countAfter = await app.list({ limit: 50 }).then(rows => rows.length)
      expect(countAfter).toBeLessThan(countBefore)
      expect(frecencyScore(app, frequentId)).toBe(scoreBefore)
    })

    it('restores usage when import throws before return', async () => {
      const { app, sourcesDir, frequentId, scoreBefore } = await prepareFrequentVisitHarness({
        'entries.yml': BASE_ENTRIES_YML
      })

      await expect(app.sync(sourcesDir, { throwAfterImport: true })).rejects.toThrow('throwAfterImport')

      expect(frecencyScore(app, frequentId)).toBe(scoreBefore)
    })
  })
})
