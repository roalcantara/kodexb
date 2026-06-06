import { expect } from '@playwright/test'
import type { Actor, Answerable } from './actor.ability'

export class ShortcutsOverlayIsOpen implements Answerable {
  static now(): ShortcutsOverlayIsOpen {
    return new ShortcutsOverlayIsOpen()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const overlay = actor.page.locator('.quick-lookup-overlay')
    await expect(overlay).toBeVisible()
  }
}

export class ShortcutsOverlayIsClosed implements Answerable {
  static now(): ShortcutsOverlayIsClosed {
    return new ShortcutsOverlayIsClosed()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const overlay = actor.page.locator('.quick-lookup-overlay')
    await expect(overlay).not.toBeVisible()
  }
}

export class ShortcutsOverlaySearchIsFocused implements Answerable {
  static now(): ShortcutsOverlaySearchIsFocused {
    return new ShortcutsOverlaySearchIsFocused()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const input = actor.page.locator('.quick-lookup-input')
    await expect(input).toBeFocused()
  }
}

export class ShortcutsOverlayRowWithAction implements Answerable {
  private constructor(private readonly action: string) {}

  static named(action: string): ShortcutsOverlayRowWithAction {
    return new ShortcutsOverlayRowWithAction(action)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const row = actor.page.locator('.quick-lookup-row', { hasText: this.action }).first()
    await expect(row).toBeVisible()
  }
}

export class ShortcutsOverlayChordCardFor implements Answerable {
  private constructor(private readonly chord: string) {}

  static for(chord: string): ShortcutsOverlayChordCardFor {
    return new ShortcutsOverlayChordCardFor(chord)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const card = actor.page.locator('.quick-lookup-chord-card').first()
    await expect(card).toBeVisible()
  }
}

export class ShortcutsOverlayChordListsBindingsFor implements Answerable {
  private constructor(
    private readonly entry1: string,
    private readonly entry2: string
  ) {}

  static forEntries(entry1: string, entry2: string): ShortcutsOverlayChordListsBindingsFor {
    return new ShortcutsOverlayChordListsBindingsFor(entry1, entry2)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const card = actor.page.locator('.quick-lookup-chord-card').first()
    await expect(card).toBeVisible()
    await expect(card).toContainText(this.entry1)
    await expect(card).toContainText(this.entry2)
  }
}

export class ShortcutsOverlayRowHasHardCollision implements Answerable {
  private constructor(private readonly action: string) {}

  static forAction(action: string): ShortcutsOverlayRowHasHardCollision {
    return new ShortcutsOverlayRowHasHardCollision(action)
  }

  async answeredBy(actor: Actor): Promise<void> {
    await actor.eventually(async () => {
      const row = actor.page.locator('.quick-lookup-row', { hasText: this.action }).first()
      await expect(row).toBeVisible()
      const icon = row.locator('.quick-lookup-collision-icon--warn')
      await expect(icon).toBeVisible()
    })
  }
}

export class ShortcutsOverlayAllRowsBelongToApp implements Answerable {
  private constructor(private readonly appSlug: string) {}

  static forApp(appSlug: string): ShortcutsOverlayAllRowsBelongToApp {
    return new ShortcutsOverlayAllRowsBelongToApp(appSlug)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const rows = actor.page.locator('.quick-lookup-row')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const appLabel = await rows.nth(i).locator('.quick-lookup-row-app').textContent()
      expect(appLabel?.toLowerCase()).toContain(this.appSlug.toLowerCase())
    }
  }
}

export class ShortcutsOverlayFilterModalIsOpen implements Answerable {
  static now(): ShortcutsOverlayFilterModalIsOpen {
    return new ShortcutsOverlayFilterModalIsOpen()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const modal = actor.page.locator('.quick-lookup-filter-modal')
    await expect(modal).toBeVisible()
  }
}

export class ShortcutsOverlayFilterModalIsClosed implements Answerable {
  static now(): ShortcutsOverlayFilterModalIsClosed {
    return new ShortcutsOverlayFilterModalIsClosed()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const modal = actor.page.locator('.quick-lookup-filter-modal')
    await expect(modal).not.toBeVisible()
  }
}
