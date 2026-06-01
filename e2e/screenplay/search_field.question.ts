import { expect } from '@playwright/test'
import type { Actor, Answerable } from './actor.ability'

export class SearchFieldIsFocused implements Answerable {
  static now(): SearchFieldIsFocused {
    return new SearchFieldIsFocused()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const search = actor.page.locator('input[aria-label="Search"]')
    await expect(search).toBeFocused({ timeout: 15_000 })
  }
}
