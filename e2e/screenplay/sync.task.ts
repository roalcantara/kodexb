import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { expect } from '@playwright/test'
import type { Actor, Performable } from './actor.ability'

function loadFixturePaths() {
  return JSON.parse(readFileSync(path.join(import.meta.dirname, '..', '.fixture-paths.json'), 'utf-8')) as {
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

export class RunSync implements Performable {
  static now(): RunSync {
    return new RunSync()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.getByRole('button', { name: /Sync/ }).first().click()
    await actor.page.locator('.cmp-sync-modal').waitFor({ state: 'visible', timeout: 10_000 })
    await actor.eventually(async () => {
      const finished = actor.page.locator('.cmp-sync-modal-summary-title', { hasText: 'Sync finished' })
      const failed = actor.page.locator('.cmp-sync-modal-error-banner')
      await expect(finished.or(failed)).toBeVisible()
    }, 60_000)
  }
}
