import type { Actor, Performable } from './actor.ability'

export class ViewKnowledgeList implements Performable {
  static now(): ViewKnowledgeList {
    return new ViewKnowledgeList()
  }

  async performAs(actor: Actor): Promise<void> {
    const searchInput = actor.page.locator('input[aria-label="Search"]')
    await searchInput.clear({ force: true })
    await actor.page.getByRole('listbox', { name: 'Entries' }).waitFor({ state: 'visible' })
    // Focus search instead of clicking the listbox — avoids selecting a row under the pointer.
    await searchInput.focus()
  }
}
