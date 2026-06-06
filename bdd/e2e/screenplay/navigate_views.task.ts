import type { Actor, Performable } from './actor.ability'

export class OpenDetailPreview implements Performable {
  static forSelectedEntry(): OpenDetailPreview {
    return new OpenDetailPreview()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.keyboard.press('ArrowRight')
    await actor.page.locator('.cmp-list-panel--narrow').waitFor({ state: 'visible' })
  }
}

export class ExpandDetailView implements Performable {
  static now(): ExpandDetailView {
    return new ExpandDetailView()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.keyboard.press('ArrowRight')
    await actor.page.locator('.cmp-detail--full').waitFor({ state: 'visible' })
  }
}

export class ReturnToSplitView implements Performable {
  static now(): ReturnToSplitView {
    return new ReturnToSplitView()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.keyboard.press('ArrowLeft')
    await actor.page.locator('.cmp-list-panel--narrow').waitFor({ state: 'visible' })
  }
}

export class ReturnToListView implements Performable {
  static now(): ReturnToListView {
    return new ReturnToListView()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.keyboard.press('ArrowLeft')
    await actor.page.locator('.cmp-list-panel--narrow').waitFor({ state: 'hidden' })
    const search = actor.page.locator('input[aria-label="Search"]')
    await search.waitFor({ state: 'visible' })
  }
}
