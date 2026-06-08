import type { Actor, Performable } from './actor.ability'

export class OpenFilterOverlay implements Performable {
  static now(): OpenFilterOverlay {
    return new OpenFilterOverlay()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.eventually(async () => {
      const chip = actor.page.locator('.cmp-filter-chip')
      await chip.waitFor({ state: 'visible' })
      await chip.click()
      await actor.page.getByRole('listbox', { name: 'Filter options' }).waitFor({ state: 'visible' })
    }, 30_000)
  }
}

export class ChooseTypeFilter implements Performable {
  private constructor(private readonly type: string) {}

  static named(type: string): ChooseTypeFilter {
    return new ChooseTypeFilter(type)
  }

  async performAs(actor: Actor): Promise<void> {
    const dropdown = actor.page.getByRole('listbox', { name: 'Filter options' })
    const option = dropdown.getByRole('option', { name: new RegExp(this.type, 'i') })
    await option.first().waitFor({ state: 'attached', timeout: 15_000 })
    await option.first().click()
    await actor.page.waitForTimeout(200)
  }
}

export class ChooseTagFilter implements Performable {
  private constructor(private readonly tag: string) {}

  static named(tag: string): ChooseTagFilter {
    return new ChooseTagFilter(tag)
  }

  async performAs(actor: Actor): Promise<void> {
    const dropdown = actor.page.getByRole('listbox', { name: 'Filter options' })
    const option = dropdown.getByRole('option', { name: new RegExp(this.tag, 'i') })
    await option.first().click()
    await actor.page.waitForTimeout(200)
  }
}

export class ChooseTaskViewFilter implements Performable {
  private constructor(private readonly view: string) {}

  static named(view: string): ChooseTaskViewFilter {
    return new ChooseTaskViewFilter(view)
  }

  async performAs(actor: Actor): Promise<void> {
    const dropdown = actor.page.getByRole('listbox', { name: 'Filter options' })
    const option = dropdown.getByRole('option', { name: new RegExp(this.view, 'i') })
    await option.first().click()
    await actor.page.waitForTimeout(200)
  }
}
