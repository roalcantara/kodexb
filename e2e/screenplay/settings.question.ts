import { expect } from '@playwright/test'
import type { RpcGetConfigPayload } from '@shared/rpc'
import type { Actor, Answerable } from './actor.ability'

export async function loadActiveConfig(actor: Actor): Promise<RpcGetConfigPayload> {
  const res = await actor.page.request.post('/api/getConfig', { data: {} })
  expect(res.ok()).toBe(true)
  return (await res.json()) as RpcGetConfigPayload
}

function pathRow(actor: Actor, label: string) {
  return actor.page.locator('.cmp-settings-block-row').filter({
    has: actor.page.locator('.cmp-settings-label', { hasText: label })
  })
}

export class SettingsShowsSourcesPath implements Answerable {
  static now(): SettingsShowsSourcesPath {
    return new SettingsShowsSourcesPath()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const config = await loadActiveConfig(actor)
    const sourcesCode = pathRow(actor, 'Sources').locator('.cmp-settings-path')
    await expect(sourcesCode).toHaveText(config.sources.path)
  }
}

export class SettingsShowsDatabasePath implements Answerable {
  static now(): SettingsShowsDatabasePath {
    return new SettingsShowsDatabasePath()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const config = await loadActiveConfig(actor)
    const dbCode = pathRow(actor, 'Database').locator('.cmp-settings-path')
    await expect(dbCode).toHaveText(config.database.path)
  }
}

export class SettingsShowsPageSize implements Answerable {
  static now(): SettingsShowsPageSize {
    return new SettingsShowsPageSize()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const checked = actor.page.locator('.cmp-settings-fieldset input[type="radio"]:checked')
    await expect(checked).toBeVisible()
  }
}

export class SettingsReportsSaved implements Answerable {
  static now(): SettingsReportsSaved {
    return new SettingsReportsSaved()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const saved = actor.page.locator('.cmp-settings-saved')
    await expect(saved).toBeVisible()
  }
}

export class SettingsShowsPersistedPageSize implements Answerable {
  static now(): SettingsShowsPersistedPageSize {
    return new SettingsShowsPersistedPageSize()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const config = await loadActiveConfig(actor)
    const checked = actor.page.locator(`.cmp-settings-fieldset input[type="radio"][value="${config.display.pageSize}"]`)
    await expect(checked).toBeChecked()
  }
}
