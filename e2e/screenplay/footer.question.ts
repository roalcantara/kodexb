import { expect } from '@playwright/test'
import type { Actor, Answerable } from './actor.ability'

export class FooterReportsFilteredCount implements Answerable {
  static now(): FooterReportsFilteredCount {
    return new FooterReportsFilteredCount()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const footer = actor.page.locator('.cmp-footer > span').first()
    await expect(footer).toBeVisible()
    const text = await footer.textContent()
    expect(text).toBeTruthy()
    expect(text).toMatch(/\d/)
  }
}
