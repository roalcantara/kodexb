import type { Actor, Performable } from './actor.ability'

export class AssertDialogError implements Performable {
  constructor(private readonly expectedText: string) {}

  async performAs(actor: Actor): Promise<void> {
    const dialog = actor.page.locator('[data-testid="task-sheet-error"]')
    await dialog.waitFor({ state: 'visible', timeout: 5_000 })
    const text = await dialog.textContent()
    if (text === null || !text.includes(this.expectedText)) {
      throw new Error(`Expected dialog error to include "${this.expectedText}", got "${text}"`)
    }
  }
}
