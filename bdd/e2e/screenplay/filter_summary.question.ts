import { expect } from '@playwright/test'
import type { Actor, Answerable } from './actor.ability'

export class FilterSummaryIncludes implements Answerable {
  private constructor(private readonly text: string) {}

  static named(text: string): FilterSummaryIncludes {
    return new FilterSummaryIncludes(text)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const chip = actor.page.locator('.cmp-filter-chip')
    await expect(chip).toContainText(new RegExp(this.text, 'i'))
  }
}
