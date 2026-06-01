import type { Actor, Performable } from './actor.ability'
import { PressShortcut } from './press_shortcut.interaction'

export class OpenShortcutsOverlay implements Performable {
  static now(): OpenShortcutsOverlay {
    return new OpenShortcutsOverlay()
  }

  async performAs(actor: Actor): Promise<void> {
    await PressShortcut.named('Meta+/').performAs(actor)
    const input = actor.page.locator('.quick-lookup-input')
    await input.waitFor({ state: 'visible' })
    await input.focus()
  }
}

export class DismissShortcutsOverlay implements Performable {
  static now(): DismissShortcutsOverlay {
    return new DismissShortcutsOverlay()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.keyboard.press('Escape')
  }
}

export class SearchShortcutsByText implements Performable {
  private constructor(private readonly query: string) {}

  static for(query: string): SearchShortcutsByText {
    return new SearchShortcutsByText(query)
  }

  async performAs(actor: Actor): Promise<void> {
    const input = actor.page.locator('.quick-lookup-input')
    await input.fill(this.query)
    await actor.page.waitForTimeout(300)
  }
}

export class SearchShortcutsByChord implements Performable {
  private constructor(private readonly chord: string) {}

  static for(chord: string): SearchShortcutsByChord {
    return new SearchShortcutsByChord(chord)
  }

  async performAs(actor: Actor): Promise<void> {
    const input = actor.page.locator('.quick-lookup-input')
    await input.fill(this.chord)
    await actor.page.waitForTimeout(300)
  }
}

export class OpenShortcutsOverlayFilterModal implements Performable {
  static now(): OpenShortcutsOverlayFilterModal {
    return new OpenShortcutsOverlayFilterModal()
  }

  async performAs(actor: Actor): Promise<void> {
    const input = actor.page.locator('.quick-lookup-input')
    await input.focus()
    await PressShortcut.named('Meta+k').performAs(actor)
    await actor.page.locator('.quick-lookup-filter-modal').waitFor({ state: 'visible' })
  }
}

export class CloseShortcutsOverlayFilterModal implements Performable {
  static now(): CloseShortcutsOverlayFilterModal {
    return new CloseShortcutsOverlayFilterModal()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.keyboard.press('Escape')
  }
}

export class SelectShortcutsOverlayFilterApp implements Performable {
  private constructor(private readonly appSlug: string) {}

  static named(appSlug: string): SelectShortcutsOverlayFilterApp {
    return new SelectShortcutsOverlayFilterApp(appSlug)
  }

  async performAs(actor: Actor): Promise<void> {
    const dropdown = actor.page.locator('.quick-lookup-filter-list')
    const option = dropdown.getByRole('option', { name: new RegExp(this.appSlug, 'i') }).first()
    await option.click()
    await actor.page.waitForTimeout(200)
  }
}
