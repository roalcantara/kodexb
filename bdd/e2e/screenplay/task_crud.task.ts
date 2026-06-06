import { expect } from '@playwright/test'
import type { Actor, Performable } from './actor.ability'
import { OpenCommandPalette } from './command_palette.task'
import { ChooseTypeFilter, OpenFilterOverlay } from './filter_overlay.task'
import { OpenDetailPreview } from './navigate_views.task'
import { SelectEntryByTitle } from './select_entry.task'

export class CreateTask implements Performable {
  private constructor(private readonly name: string) {}

  static named(name: string): CreateTask {
    return new CreateTask(name)
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.attemptsTo(OpenCommandPalette.now())
    await actor.page.locator('.cmp-command-palette-action', { hasText: 'New Task' }).click()
    const dialog = actor.page.getByRole('dialog', { name: 'New task' })
    await dialog.waitFor({ state: 'visible' })
    await dialog.locator('#ts-key').fill(this.name)
    await dialog.locator('#ts-desc').fill(`Description for ${this.name}`)
    await dialog.locator('#ts-tags').fill('e2e')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await dialog.waitFor({ state: 'hidden' })
  }
}

export class EditTaskDescription implements Performable {
  private constructor(private readonly text: string) {}

  static to(text: string): EditTaskDescription {
    return new EditTaskDescription(text)
  }

  async performAs(actor: Actor): Promise<void> {
    const listbox = actor.page.getByRole('listbox', { name: 'Entries' })
    await listbox.focus()
    const edit = actor.page.locator('.cmp-footer-primary', { hasText: 'Edit Task' })
    await edit.waitFor({ state: 'visible', timeout: 10_000 })
    await edit.click()
    const dialog = actor.page.getByRole('dialog', { name: 'Edit task' })
    await dialog.waitFor({ state: 'visible' })
    await dialog.locator('#ts-desc').fill(this.text)
    await dialog.getByRole('button', { name: 'Save' }).click()
    await dialog.waitFor({ state: 'hidden' })
    await actor.attemptsTo(OpenDetailPreview.forSelectedEntry())
    const detail = actor.page.locator('article.cmp-detail-page')
    await expect(detail.locator('.cmp-detail-page-desc')).toHaveText(this.text, { timeout: 15_000 })
  }
}

export class CycleTaskField implements Performable {
  private constructor(private readonly field: string) {}

  static named(field: string): CycleTaskField {
    return new CycleTaskField(field)
  }

  async performAs(actor: Actor): Promise<void> {
    const listbox = actor.page.getByRole('listbox', { name: 'Entries' })
    await listbox.focus()
    if (this.field === 'status') {
      await actor.page.keyboard.press('s')
    } else if (this.field === 'priority') {
      await actor.page.keyboard.press('p')
    }
    await actor.page.waitForTimeout(400)
  }
}

export class ReorderTask implements Performable {
  private constructor(
    private readonly title: string,
    private readonly direction: 'up' | 'down'
  ) {}

  static upward(title: string): ReorderTask {
    return new ReorderTask(title, 'up')
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.attemptsTo(SelectEntryByTitle.named(this.title))
    const row = actor.page.locator('button.cmp-list-row', { hasText: this.title }).first()
    const idAttr = await row.getAttribute('data-entry-id')
    const entryId = Number(idAttr)
    if (!Number.isFinite(entryId)) {
      throw new Error(`Could not resolve entry id for task "${this.title}"`)
    }
    await actor.page.request.post('/api/reorderTask', {
      data: { id: entryId, dir: this.direction }
    })
    await actor.page.reload()
    await actor.page.getByRole('listbox', { name: 'Entries' }).waitFor({ state: 'visible' })
    await actor.attemptsTo(OpenFilterOverlay.now())
    await actor.attemptsTo(ChooseTypeFilter.named('task'))
    await actor.page.keyboard.press('Escape')
    await actor.page.waitForTimeout(200)
  }
}

export class DeleteTask implements Performable {
  private constructor(private readonly title: string) {}

  static named(title: string): DeleteTask {
    return new DeleteTask(title)
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.attemptsTo(SelectEntryByTitle.named(this.title))
    const listbox = actor.page.getByRole('listbox', { name: 'Entries' })
    await listbox.focus()
    await actor.page.keyboard.press('Delete')
    await actor.page.waitForTimeout(500)
  }
}
