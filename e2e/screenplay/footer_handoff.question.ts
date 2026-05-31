import { expect } from '@playwright/test'
import type { Actor, Answerable } from './actor.ability'

export class FooterHandoffPrimaryLabel implements Answerable {
  private constructor(private readonly label: string) {}

  static is(label: string): FooterHandoffPrimaryLabel {
    return new FooterHandoffPrimaryLabel(label)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const btn = actor.page.locator('.cmp-footer-primary')
    await expect(btn).toBeVisible()
    await expect(btn).toContainText(this.label)
  }
}

export class FooterHandoffSecondaryLabel implements Answerable {
  private constructor(private readonly label: string) {}

  static is(label: string): FooterHandoffSecondaryLabel {
    return new FooterHandoffSecondaryLabel(label)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const btn = actor.page.locator('.cmp-footer-secondary')
    await expect(btn).toBeVisible()
    await expect(btn).toContainText(this.label)
  }
}

export class FooterHandoffNoSecondary implements Answerable {
  static now(): FooterHandoffNoSecondary {
    return new FooterHandoffNoSecondary()
  }

  async answeredBy(actor: Actor): Promise<void> {
    await expect(actor.page.locator('.cmp-footer-secondary')).toHaveCount(0)
  }
}
