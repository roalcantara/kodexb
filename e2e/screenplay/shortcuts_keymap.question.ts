import { expect } from '@playwright/test'
import type { Actor, Answerable } from './actor.ability'

export class ShortcutKeymapIsVisible implements Answerable {
  static now(): ShortcutKeymapIsVisible {
    return new ShortcutKeymapIsVisible()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const keymap = actor.page.locator('.cmp-shortcut-keymap')
    await expect(keymap).toBeVisible()
  }
}

export class ShortcutKeymapBindingIsSelected implements Answerable {
  private constructor(private readonly action: string) {}

  static named(action: string): ShortcutKeymapBindingIsSelected {
    return new ShortcutKeymapBindingIsSelected(action)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const row = actor.page.locator('.cmp-keymap-row', { hasText: this.action }).first()
    await expect(row).toHaveClass(/cmp-keymap-row--selected/)
  }
}

export class ShortcutKeymapHasBinding implements Answerable {
  private constructor(private readonly action: string) {}

  static forAction(action: string): ShortcutKeymapHasBinding {
    return new ShortcutKeymapHasBinding(action)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const row = actor.page.locator('.cmp-keymap-row', { hasText: this.action }).first()
    await expect(row).toBeVisible()
  }
}

export class ChordDetailIsVisible implements Answerable {
  static now(): ChordDetailIsVisible {
    return new ChordDetailIsVisible()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const detail = actor.page.locator('.cmp-chord-detail')
    await expect(detail).toBeVisible()
  }
}

export class ChordDetailShowsBindingsFor implements Answerable {
  private constructor(private readonly chord: string) {}

  static forChord(chord: string): ChordDetailShowsBindingsFor {
    return new ChordDetailShowsBindingsFor(chord)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const detail = actor.page.locator(`.cmp-chord-detail[data-chord-hash="${this.chord}"]`)
    await expect(detail).toBeVisible()
  }
}

export class ChordDetailBackToKeymapIsSelected implements Answerable {
  private constructor(private readonly action: string) {}

  static forBinding(action: string): ChordDetailBackToKeymapIsSelected {
    return new ChordDetailBackToKeymapIsSelected(action)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const row = actor.page.locator('.cmp-keymap-row', { hasText: this.action }).first()
    await expect(row).toHaveClass(/cmp-keymap-row--selected/)
  }
}

export class EntryListIncludesShortcutEntry implements Answerable {
  private constructor(private readonly title: string) {}

  static named(title: string): EntryListIncludesShortcutEntry {
    return new EntryListIncludesShortcutEntry(title)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const row = actor.page.locator('.cmp-list-row', { hasText: this.title }).first()
    await expect(row).toBeVisible()
  }
}

export class EntryRowShowsShortcutGlyph implements Answerable {
  private constructor(private readonly title: string) {}

  static forEntry(title: string): EntryRowShowsShortcutGlyph {
    return new EntryRowShowsShortcutGlyph(title)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const row = actor.page.locator('.cmp-list-row', { hasText: this.title }).first()
    const glyph = row.locator('.cmp-tag--type-shortcut')
    await expect(glyph).toBeVisible()
  }
}
