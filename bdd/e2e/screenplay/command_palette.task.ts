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
    const searchbox = actor.page.getByRole('searchbox', { name: 'Search' })
    const listbox = actor.page.getByRole('listbox', { name: 'Entries' })

    await searchbox.focus()

    const selectionAttr = await listbox.getAttribute('data-list-selection')
    if (selectionAttr === 'true') {
      await listbox.focus()
      await actor.page.keyboard.press('a')

      await expect(listbox).toHaveAttribute('data-list-selection', 'false', { timeout: 2_000 })

      await searchbox.focus()
      await searchbox.fill('')
    }

    await actor.page.waitForTimeout(200)
  }
}
