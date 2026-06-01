import { expect } from '@playwright/test'
import type { Actor, Answerable } from './actor.ability'

export class ActionToastIsSuccess implements Answerable {
  static now(): ActionToastIsSuccess {
    return new ActionToastIsSuccess()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const toast = actor.page.locator('.cmp-action-toast')
    await expect(toast.first()).toBeVisible({ timeout: 10_000 })
  }
}

export class ActionToastIsSuccessFor implements Answerable {
  private constructor(private readonly fragment: string) {}

  static with(fragment: string): ActionToastIsSuccessFor {
    return new ActionToastIsSuccessFor(fragment)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const toast = actor.page.locator('.cmp-action-toast')
    await expect(toast.first()).toBeVisible({ timeout: 10_000 })
    await expect(toast.first()).toContainText(this.fragment, { timeout: 5_000 })
  }
}

export class ActionToastIsError implements Answerable {
  static now(): ActionToastIsError {
    return new ActionToastIsError()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const toast = actor.page.locator('.cmp-action-toast')
    await expect(toast.first()).toBeVisible({ timeout: 10_000 })
  }
}
