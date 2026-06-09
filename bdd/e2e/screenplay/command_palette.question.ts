import { expect } from '@playwright/test'
import type { Actor, Answerable } from './actor.ability'

export class CommandPaletteShowsSection implements Answerable {
  private constructor(private readonly section: string) {}

  static named(section: string): CommandPaletteShowsSection {
    return new CommandPaletteShowsSection(section)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const section = actor.page.locator('.cmp-command-palette-section', { hasText: this.section })
    await expect(section).toBeVisible()
  }
}

export class CommandPaletteHidesSection implements Answerable {
  private constructor(private readonly section: string) {}

  static named(section: string): CommandPaletteHidesSection {
    return new CommandPaletteHidesSection(section)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const section = actor.page.locator('.cmp-command-palette-section', { hasText: this.section })
    await expect(section).toHaveCount(0)
  }
}

export class CommandPaletteAllActionsMatch implements Answerable {
  private constructor(private readonly query: string) {}

  static for(query: string): CommandPaletteAllActionsMatch {
    return new CommandPaletteAllActionsMatch(query)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const actions = actor.page.locator('.cmp-command-palette-action')
    const count = await actions.count()
    expect(count).toBeGreaterThan(0)
    const q = this.query.toLowerCase()
    for (let i = 0; i < count; i++) {
      const text = (await actions.nth(i).textContent())?.toLowerCase() ?? ''
      expect(text).toContain(q)
    }
  }
}

export class ListHasNoSelection implements Answerable {
  static now(): ListHasNoSelection {
    return new ListHasNoSelection()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const listbox = actor.page.getByRole('listbox', { name: 'Entries' })
    await expect(listbox).toHaveAttribute('data-list-selection', 'false', { timeout: 5_000 })
  }
}

export class CommandPaletteIsClosed implements Answerable {
  static now(): CommandPaletteIsClosed {
    return new CommandPaletteIsClosed()
  }

  async answeredBy(actor: Actor): Promise<void> {
    await expect(actor.page.locator('.cmp-command-palette')).toHaveCount(0)
  }
}

export class EntryListIsReadyForKeyboard implements Answerable {
  static now(): EntryListIsReadyForKeyboard {
    return new EntryListIsReadyForKeyboard()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const searchInput = actor.page.locator('input[aria-label="Search"]')
    await expect(searchInput).toBeFocused()
  }
}
