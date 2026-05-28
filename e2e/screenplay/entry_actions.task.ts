import type { Actor, Performable } from './actor.ability'

export class RunPrimaryAction implements Performable {
  static forSelectedEntry(): RunPrimaryAction {
    return new RunPrimaryAction()
  }

  async performAs(actor: Actor): Promise<void> {
    const listbox = actor.page.getByRole('listbox', { name: 'Entries' })
    await listbox.focus()
    await actor.page.keyboard.press('Enter')
    await actor.page.locator('.cmp-action-toast').first().waitFor({ state: 'visible', timeout: 10_000 })
  }
}

export class CopySelectedEntry implements Performable {
  static now(): CopySelectedEntry {
    return new CopySelectedEntry()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.keyboard.press('Meta+c')
  }
}

export class OpenSelectedEntrySource implements Performable {
  static now(): OpenSelectedEntrySource {
    return new OpenSelectedEntrySource()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.keyboard.press('Meta+p')
    await actor.page.waitForTimeout(500)
    const palette = actor.page.locator('.cmp-command-palette-action')
    const count = await palette.count()
    for (let i = 0; i < count; i++) {
      const text = await palette.nth(i).textContent()
      if (text?.includes('Open in Editor')) {
        await palette.nth(i).click()
        return
      }
    }
    throw new Error(`Could not find "Open in Editor" action among ${count} palette items`)
  }
}
