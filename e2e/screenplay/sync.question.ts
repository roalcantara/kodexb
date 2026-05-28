import { expect } from '@playwright/test'
import type { Actor, Answerable } from './actor.ability'

export class SyncReportsCompletion implements Answerable {
  static now(): SyncReportsCompletion {
    return new SyncReportsCompletion()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const summary = actor.page.locator('.cmp-sync-modal-summary-title', { hasText: 'Sync finished' })
    await expect(summary).toBeVisible()
    const close = actor.page.getByRole('button', { name: 'Close' })
    await expect(close).toBeVisible()
    await close.click()
    await actor.page.locator('.cmp-sync-modal').waitFor({ state: 'hidden' })
  }
}

export class SyncReportsInvalidFile implements Answerable {
  static now(): SyncReportsInvalidFile {
    return new SyncReportsInvalidFile()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const errorRow = actor.page.locator('.cmp-sync-modal-file-row--error')
    const summaryErrors = actor.page.locator('.cmp-sync-modal-summary-errors li')
    await expect(errorRow.or(summaryErrors).first()).toBeVisible()
    const close = actor.page.getByRole('button', { name: 'Close' })
    if (await close.isVisible()) {
      await close.click()
      await actor.page.locator('.cmp-sync-modal').waitFor({ state: 'hidden' })
    }
  }
}
