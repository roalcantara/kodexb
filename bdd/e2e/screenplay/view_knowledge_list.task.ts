import type { Actor, Performable } from './actor.ability'

export class ViewKnowledgeList implements Performable {
  static now(): ViewKnowledgeList {
    return new ViewKnowledgeList()
  }

  async performAs(actor: Actor): Promise<void> {
    const searchInput = actor.page.locator('input[aria-label="Search"]')
    await searchInput.clear({ force: true })
    await actor.page.waitForTimeout(300)
    const listbox = actor.page.getByRole('listbox', { name: 'Entries' })
    await listbox.waitFor({ state: 'visible' })
    await listbox.click()
    await actor.page.waitForTimeout(100)
  }
}
