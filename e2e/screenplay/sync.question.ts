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
    await expect(errorRow.first()).toBeVisible()
    const close = actor.page.getByRole('button', { name: 'Close' })
    if (await close.isVisible()) {
      await close.click()
      await actor.page.locator('.cmp-sync-modal').waitFor({ state: 'hidden' })
    }
  }
}

export class SyncModalFinishesWithinMs implements Answerable {
  private constructor(private readonly ms: number) {}

  static within(ms: number): SyncModalFinishesWithinMs {
    return new SyncModalFinishesWithinMs(ms)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const finished = actor.page.locator('.cmp-sync-modal-summary-title', { hasText: 'Sync finished' })
    const failed = actor.page.locator('.cmp-sync-modal-error-banner')
    await expect(finished.or(failed)).toBeVisible({ timeout: this.ms })
  }
}

export class SyncModalListsFailedFile implements Answerable {
  private constructor(private readonly basename: string) {}

  static named(basename: string): SyncModalListsFailedFile {
    return new SyncModalListsFailedFile(basename)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const errorRow = actor.page.locator('.cmp-sync-modal-file-row--error', { hasText: this.basename })
    await expect(errorRow).toBeVisible()
  }
}

export class SyncModalErrorDetailContains implements Answerable {
  private constructor(private readonly text: string) {}

  static text(text: string): SyncModalErrorDetailContains {
    return new SyncModalErrorDetailContains(text)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const detail = actor.page.locator('.cmp-sync-modal-error-detail', {
      hasText: this.text
    })
    await expect(detail.first()).toBeVisible()
  }
}

export class SyncModalFileShowsPartialSuccess implements Answerable {
  private constructor(private readonly basename: string) {}

  static named(basename: string): SyncModalFileShowsPartialSuccess {
    return new SyncModalFileShowsPartialSuccess(basename)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const row = actor.page.locator('.cmp-sync-modal-file-row--error', { hasText: this.basename })
    await expect(row).toBeVisible()
    await expect(row.locator('.cmp-sync-modal-file-row--interactive')).toBeVisible()
  }
}

export class SyncModalShowsAtLeastNbrFilesWithErrors implements Answerable {
  private constructor(private readonly n: number) {}

  static showsAtLeastNbrFilesWithErrors(n: number): SyncModalShowsAtLeastNbrFilesWithErrors {
    return new SyncModalShowsAtLeastNbrFilesWithErrors(n)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const statsStrip = actor.page.locator('.cmp-sync-modal-stats-strip')
    await expect(statsStrip).toBeVisible()
    const errorRows = actor.page.locator('.cmp-sync-modal-file-row--error')
    await expect.poll(async () => errorRows.count()).toBeGreaterThanOrEqual(this.n)
  }
}

export class SyncModalShowsFileTotalsStrip implements Answerable {
  static now(): SyncModalShowsFileTotalsStrip {
    return new SyncModalShowsFileTotalsStrip()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const strip = actor.page.locator('.cmp-sync-modal-stats-strip')
    await expect(strip).toBeVisible()
    await expect(strip).toContainText('Files processed:')
    await expect(strip).toContainText('Imported:')
    await expect(strip).toContainText('With errors:')
  }
}

export class SyncModalAccordionContains implements Answerable {
  private constructor(
    private readonly basename: string,
    private readonly text: string
  ) {}

  static accordionContains(basename: string, text: string): SyncModalAccordionContains {
    return new SyncModalAccordionContains(basename, text)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const row = actor.page.locator('.cmp-sync-modal-file-row--error', { hasText: this.basename })
    const detail = row.locator('.cmp-sync-modal-error-detail')
    await expect(detail).toBeVisible()
    await expect(detail).toContainText(this.text)
  }
}

export class SyncModalFirstErrorRowInView implements Answerable {
  static now(): SyncModalFirstErrorRowInView {
    return new SyncModalFirstErrorRowInView()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const firstError = actor.page.locator('.cmp-sync-modal-file-row--error').first()
    await expect(firstError).toBeVisible()
    await expect(firstError).toBeInViewport()
  }
}
