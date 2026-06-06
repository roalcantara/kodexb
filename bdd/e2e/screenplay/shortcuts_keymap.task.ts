import type { Actor, Performable } from './actor.ability'

export class OpenKeymapDetailForSelectedEntry implements Performable {
  static now(): OpenKeymapDetailForSelectedEntry {
    return new OpenKeymapDetailForSelectedEntry()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.keyboard.press('ArrowRight')
    await actor.page.locator('.cmp-shortcut-keymap').waitFor({ state: 'visible' })
  }
}

export class SelectKeymapBinding implements Performable {
  private constructor(private readonly action: string) {}

  static named(action: string): SelectKeymapBinding {
    return new SelectKeymapBinding(action)
  }

  async performAs(actor: Actor): Promise<void> {
    const rows = actor.page.locator('.cmp-keymap-row')
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).textContent()
      if (text?.includes(this.action)) {
        const row = rows.nth(i)
        await row.click()
        await row.focus()
        return
      }
    }
    throw new Error(`Binding row with action "${this.action}" not found`)
  }
}

export class OpenChordDetailForSelectedBinding implements Performable {
  static now(): OpenChordDetailForSelectedBinding {
    return new OpenChordDetailForSelectedBinding()
  }

  async performAs(actor: Actor): Promise<void> {
    const selected = actor.page.locator('.cmp-keymap-row--selected').first()
    await selected.focus()
    await selected.press('Enter')
    await actor.page.locator('.cmp-chord-detail').waitFor({ state: 'visible' })
  }
}

export class NavigateBackFromChordDetail implements Performable {
  static now(): NavigateBackFromChordDetail {
    return new NavigateBackFromChordDetail()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.locator('.cmp-chord-detail__back').click()
    await actor.page.locator('.cmp-shortcut-keymap').waitFor({ state: 'visible' })
  }
}
