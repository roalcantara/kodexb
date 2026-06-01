import { expect } from '@playwright/test'
import type { Actor, Answerable } from './actor.ability'

export class SyncReportsHardCollision implements Answerable {
  static forChord(chordHash: string): SyncReportsHardCollision {
    return new SyncReportsHardCollision(chordHash)
  }

  private constructor(private readonly chordHash: string) {}

  async answeredBy(actor: Actor): Promise<void> {
    await actor.eventually(async () => {
      const summary = actor.page.locator('.cmp-sync-modal-summary-title', { hasText: 'Sync finished' })
      await expect(summary).toBeVisible()
      const warnings = actor.page.locator('.cmp-sync-modal-summary-warnings li')
      await expect(warnings.first()).toBeVisible()
      await expect(warnings.first()).toContainText('hard collision')
      await expect(warnings.first()).toContainText(this.chordHash)
    })
    const close = actor.page.getByRole('button', { name: 'Close' })
    await expect(close).toBeVisible()
    await close.click()
    await actor.page.locator('.cmp-sync-modal').waitFor({ state: 'hidden' })
  }
}
