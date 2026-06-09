import { expect } from '@playwright/test'
import type { Actor, Performable } from './actor.ability'

export class OpenCommandPalette implements Performable {
  static now(): OpenCommandPalette {
    return new OpenCommandPalette()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.keyboard.press('Meta+p')
    await actor.page.locator('.cmp-command-palette').waitFor({ state: 'visible' })
  }
}

export class SearchPaletteActions implements Performable {
  private constructor(private readonly query: string) {}

  static for(query: string): SearchPaletteActions {
    return new SearchPaletteActions(query)
  }

  async performAs(actor: Actor): Promise<void> {
    const search = actor.page.locator('.cmp-command-palette-search')
    await search.fill(this.query)
    await actor.page.waitForTimeout(200)
  }
}

export class DismissCommandPalette implements Performable {
  static now(): DismissCommandPalette {
    return new DismissCommandPalette()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.locator('.cmp-command-palette-search').focus()
    await actor.page.keyboard.press('Escape')
    await actor.page.locator('.cmp-command-palette').waitFor({ state: 'hidden' })
  }
}

export class ClearListSelection implements Performable {
  static now(): ClearListSelection {
    return new ClearListSelection()
  }

  async performAs(actor: Actor): Promise<void> {
    const listbox = actor.page.getByRole('listbox', { name: 'Entries' })
    const search = actor.page.locator('input[aria-label="Search"]')

    // If already clear, skip ArrowUp loop — still guard against pointer re-select below.
    const selected = actor.page.locator('button.cmp-list-row--selected')

    if ((await selected.count()) > 0) {
      await listbox.focus()
      let safety = 0
      while ((await selected.count()) > 0 && safety < 80) {
        await listbox.press('ArrowUp')
        safety++
      }
    }

    // Wait on authoritative app-owned attribute (not just CSS class count)
    await expect(listbox).toHaveAttribute('data-list-selection', 'false', { timeout: 10_000 })

    // Prevent useListPointerSelection from re-selecting under the cursor before Meta+p
    await actor.page.mouse.move(0, 0)
    await search.focus()
  }
}
