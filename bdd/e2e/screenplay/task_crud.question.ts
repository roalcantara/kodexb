import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect } from '@playwright/test'
import type { Actor, Answerable } from './actor.ability'

function loadFixtureSourcesPath(): string {
  const paths = JSON.parse(readFileSync(path.join(import.meta.dirname, '..', '.fixture-paths.json'), 'utf-8')) as {
    sourcesPath: string
  }
  return paths.sourcesPath
}

function readTaskSourceYaml(): string {
  const sourcesPath = loadFixtureSourcesPath()
  const chunks: string[] = []
  const writeTarget = path.join(sourcesPath, 'tasks.yml')
  if (existsSync(writeTarget)) chunks.push(readFileSync(writeTarget, 'utf-8'))
  const tasksDir = path.join(sourcesPath, 'tasks')
  if (existsSync(tasksDir)) {
    for (const name of readdirSync(tasksDir).filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))) {
      chunks.push(readFileSync(path.join(tasksDir, name), 'utf-8'))
    }
  }
  return chunks.join('\n')
}

export class EntryListIncludesTitle implements Answerable {
  private constructor(private readonly title: string) {}

  static named(title: string): EntryListIncludesTitle {
    return new EntryListIncludesTitle(title)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const row = actor.page.locator('button.cmp-list-row', { hasText: this.title })
    await expect(row.first()).toBeVisible()
  }
}

export class EntryListExcludesTitle implements Answerable {
  private constructor(private readonly title: string) {}

  static named(title: string): EntryListExcludesTitle {
    return new EntryListExcludesTitle(title)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const row = actor.page.locator('button.cmp-list-row', { hasText: this.title })
    await expect(row).toHaveCount(0)
  }
}

export class FixtureSourcesTaskFileIncludes implements Answerable {
  private constructor(private readonly text: string) {}

  static named(text: string): FixtureSourcesTaskFileIncludes {
    return new FixtureSourcesTaskFileIncludes(text)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const content = readTaskSourceYaml()
    expect(content).toContain(this.text)
  }
}

export class FixtureSourcesTaskFileExcludes implements Answerable {
  private constructor(private readonly text: string) {}

  static named(text: string): FixtureSourcesTaskFileExcludes {
    return new FixtureSourcesTaskFileExcludes(text)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const content = readTaskSourceYaml()
    expect(content).not.toContain(this.text)
  }
}

export class TaskDetailShowsNextFieldValue implements Answerable {
  private constructor(private readonly field: string) {}

  static named(field: string): TaskDetailShowsNextFieldValue {
    return new TaskDetailShowsNextFieldValue(field)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const selectedRow = actor.page.locator('button.cmp-list-row--selected')
    await expect(selectedRow).toBeVisible()
    if (this.field === 'status') {
      await expect(selectedRow.locator('.cmp-pill--doing, .cmp-pill--done, .cmp-pill--todo').first()).toBeVisible()
    } else if (this.field === 'priority') {
      await expect(
        selectedRow.locator('.cmp-pill--low, .cmp-pill--mid, .cmp-pill--high, .cmp-pill--urgent').first()
      ).toBeVisible()
    }
  }
}
