import type { Actor, Performable } from './actor.ability'

export class SearchEntries implements Performable {
  private constructor(private readonly query: string) {}

  static for(query: string): SearchEntries {
    return new SearchEntries(query)
  }

  async performAs(actor: Actor): Promise<void> {
    const searchInput = actor.page.locator('input[aria-label="Search"]')
    await searchInput.fill(this.query)
    actor.remember('lastSearchQuery', this.query)
    await actor.page.waitForTimeout(500)
  }
}
