import { expect } from '@playwright/test'
import type { Actor, Answerable } from './actor.ability'

export class ActionFeedbackSucceeded implements Answerable {
  private constructor(private readonly _title: string) {}

  static for(title: string): ActionFeedbackSucceeded {
    return new ActionFeedbackSucceeded(title)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const toast = actor.page.locator('.cmp-action-toast')
    await expect(toast.first()).toBeVisible({ timeout: 8_000 })
  }
}

export class ActionFeedbackClipboardCopied implements Answerable {
  private constructor(private readonly _title: string) {}

  static for(title: string): ActionFeedbackClipboardCopied {
    return new ActionFeedbackClipboardCopied(title)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const toast = actor.page.locator('.cmp-action-toast')
    await expect(toast.first()).toBeVisible({ timeout: 8_000 })
  }
}

export class ActionFeedbackSourceTargetsFixture implements Answerable {
  static now(): ActionFeedbackSourceTargetsFixture {
    return new ActionFeedbackSourceTargetsFixture()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const palette = actor.page.locator('.cmp-command-palette')
    await expect(palette).toHaveCount(0, { timeout: 5_000 })
  }
}
