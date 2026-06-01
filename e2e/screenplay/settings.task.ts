import { expect } from '@playwright/test'
import type { Actor, Performable } from './actor.ability'
import { loadActiveConfig } from './settings.question'

export class OpenSettings implements Performable {
  static now(): OpenSettings {
    return new OpenSettings()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.getByRole('button', { name: 'Settings' }).click()
    await actor.page.locator('.cmp-settings').waitFor({ state: 'visible' })
    await actor.page.locator('.cmp-settings-title', { hasText: 'Settings' }).waitFor({ state: 'visible' })
  }
}

export class ChangePageSize implements Performable {
  private constructor(private readonly size: string) {}

  static to(size: string): ChangePageSize {
    return new ChangePageSize(size)
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.locator(`.cmp-settings-fieldset input[type="radio"][value="${this.size}"]`).click()
  }
}

export class SaveSettings implements Performable {
  static now(): SaveSettings {
    return new SaveSettings()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.getByRole('button', { name: 'Save' }).click()
    await actor.page.locator('.cmp-settings-saved').waitFor({ state: 'visible' })
  }
}

export class ResetSettings implements Performable {
  static now(): ResetSettings {
    return new ResetSettings()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.getByRole('button', { name: 'Reset to defaults' }).click()
    const config = await loadActiveConfig(actor)
    await expect(
      actor.page.locator(`.cmp-settings-fieldset input[type="radio"][value="${config.display.pageSize}"]`)
    ).toBeChecked()
  }
}
