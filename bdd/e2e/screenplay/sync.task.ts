import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { expect } from '@playwright/test'
import { FIXTURE_PATHS_FILE } from '../support/fixtures.support'
import type { Actor, Performable } from './actor.ability'
import { OpenCommandPalette, SearchPaletteActions } from './command_palette.task'

function loadFixturePaths() {
  return JSON.parse(readFileSync(FIXTURE_PATHS_FILE, 'utf-8')) as {
    sourcesPath: string
  }
}

export class WriteFixtureBookmark implements Performable {
  private constructor(private readonly name: string) {}

  static named(name: string): WriteFixtureBookmark {
    return new WriteFixtureBookmark(name)
  }

  async performAs(actor: Actor): Promise<void> {
    const { sourcesPath } = loadFixturePaths()
    const yaml = `bookmarks:\n  ${this.name}:\n    desc: Synced via e2e test\n    tags: [regression, e2e]\n    links:\n      - https://example.dev/synced\n`
    const filePath = path.join(sourcesPath, 'bookmarks', 'synced.yml')
    mkdirSync(path.dirname(filePath), { recursive: true })
    writeFileSync(filePath, yaml, 'utf-8')
  }
}

export class WriteInvalidFixtureSource implements Performable {
  static now(): WriteInvalidFixtureSource {
    return new WriteInvalidFixtureSource()
  }

  async performAs(actor: Actor): Promise<void> {
    const { sourcesPath } = loadFixturePaths()
    const filePath = path.join(sourcesPath, 'invalid', 'bad.yml')
    mkdirSync(path.dirname(filePath), { recursive: true })
    writeFileSync(filePath, 'invalid: [unclosed yaml: [[[', 'utf-8')
  }
}

export class WriteSyncResilienceFixtureSources implements Performable {
  static now(): WriteSyncResilienceFixtureSources {
    return new WriteSyncResilienceFixtureSources()
  }

  async performAs(actor: Actor): Promise<void> {
    const { sourcesPath } = loadFixturePaths()
    const sourceDir = path.join(import.meta.dirname, '..', '..', '..', 'src', '__tests__', 'fixtures', 'sync')
    const targetDir = path.join(sourcesPath, 'sync')
    mkdirSync(targetDir, { recursive: true })
    const files = readdirSync(sourceDir).filter(f => f.endsWith('.yml'))
    for (const file of files) {
      cpSync(path.join(sourceDir, file), path.join(targetDir, file))
    }
  }
}

export class RunSync implements Performable {
  static now(): RunSync {
    return new RunSync()
  }

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page
    await actor.attemptsTo(OpenCommandPalette.now())
    await actor.attemptsTo(SearchPaletteActions.for('sync'))
    await page.locator('.cmp-command-palette-action', { hasText: /^Sync$/ }).click()
    await page.locator('.cmp-sync-modal').waitFor({ state: 'visible', timeout: 10_000 })
    await actor.eventually(async () => {
      const finished = actor.page.locator('.cmp-sync-modal-summary-title', { hasText: 'Sync finished' })
      const failed = actor.page.locator('.cmp-sync-modal-error-banner')
      await expect(finished.or(failed)).toBeVisible()
    }, 60_000)
  }
}

export class SyncModalExpandErrorsForFile implements Performable {
  private constructor(private readonly basename: string) {}

  static expandErrorsForFile(basename: string): SyncModalExpandErrorsForFile {
    return new SyncModalExpandErrorsForFile(basename)
  }

  async performAs(actor: Actor): Promise<void> {
    const row = actor.page.locator('.cmp-sync-modal-file-row--error button', { hasText: this.basename })
    await expect(row).toBeVisible()
    await row.click()
    await actor.page.waitForTimeout(200)
  }
}
