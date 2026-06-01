import type { Actor, Performable } from './actor.ability'

export class SelectFirstEntry implements Performable {
  static now(): SelectFirstEntry {
    return new SelectFirstEntry()
  }

  async performAs(actor: Actor): Promise<void> {
    const listbox = actor.page.getByRole('listbox', { name: 'Entries' })
    await listbox.focus()
    await actor.page.keyboard.press('ArrowDown')
    const selected = actor.page.locator('button.cmp-list-row--selected')
    await selected.waitFor({ state: 'visible' })
    const title = await selected.locator('.cmp-list-row-title').textContent()
    actor.remember('selectedEntryTitle', title?.trim() ?? '')
  }
}

export class SelectNextEntry implements Performable {
  static now(): SelectNextEntry {
    return new SelectNextEntry()
  }

  async performAs(actor: Actor): Promise<void> {
    const listbox = actor.page.getByRole('listbox', { name: 'Entries' })
    await listbox.focus()
    await actor.page.keyboard.press('ArrowDown')
    await actor.page.waitForTimeout(200)
  }
}

export class SelectEntryByTitle implements Performable {
  private constructor(private readonly title: string) {}

  static named(title: string): SelectEntryByTitle {
    return new SelectEntryByTitle(title)
  }

  async performAs(actor: Actor): Promise<void> {
    const row = actor.page.locator('button.cmp-list-row', { hasText: this.title }).first()
    await row.click()
    await actor.page
      .locator('button.cmp-list-row--selected', { hasText: this.title })
      .waitFor({ state: 'visible', timeout: 5_000 })
    actor.remember('selectedEntryTitle', this.title)
  }
}
