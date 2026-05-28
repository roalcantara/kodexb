import { expect } from '@playwright/test'
import type { Actor, Answerable } from './actor.ability'

export class EntryListIncludesType implements Answerable {
  private constructor(private readonly type: string) {}

  static named(type: string): EntryListIncludesType {
    return new EntryListIncludesType(type)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const tag = actor.page.locator(`.cmp-tag--type-${this.type}`)
    await expect(tag.first()).toBeVisible()
  }
}

export class EntryListAllMatchQuery implements Answerable {
  private constructor(private readonly query: string) {}

  static for(query: string): EntryListAllMatchQuery {
    return new EntryListAllMatchQuery(query)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const rows = actor.page.locator('button.cmp-list-row')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    const terms = this.query.toLowerCase().split(/\s+/)
    const hasAnyTerm = (text: string) => terms.some(t => text.includes(t))
    for (let i = 0; i < count; i++) {
      const text = (await rows.nth(i).textContent())?.toLowerCase() ?? ''
      expect(hasAnyTerm(text), `Row ${i} does not match any term from "${this.query}"`).toBe(true)
    }
  }
}

export class EntryListAllHaveType implements Answerable {
  private constructor(private readonly type: string) {}

  static named(type: string): EntryListAllHaveType {
    return new EntryListAllHaveType(type)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const rows = actor.page.locator('button.cmp-list-row')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).locator(`.cmp-tag--type-${this.type}`)).toBeVisible()
    }
  }
}

export class EntryListAllHaveTag implements Answerable {
  private constructor(private readonly tag: string) {}

  static named(tag: string): EntryListAllHaveTag {
    return new EntryListAllHaveTag(tag)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const rows = actor.page.locator('button.cmp-list-row')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const rowText = await rows.nth(i).textContent()
      expect(rowText?.toLowerCase()).toContain(`#${this.tag}`)
    }
  }
}

export class EntryListAllTasksInView implements Answerable {
  private constructor(private readonly view: string) {}

  static named(view: string): EntryListAllTasksInView {
    return new EntryListAllTasksInView(view)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const rows = actor.page.locator('button.cmp-list-row')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).locator('.cmp-tag--type-task')).toBeVisible()
    }
  }
}

export class EntryListSelectedRowChanged implements Answerable {
  static now(): EntryListSelectedRowChanged {
    return new EntryListSelectedRowChanged()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const selected = actor.page.locator('button.cmp-list-row--selected')
    await expect(selected).toBeVisible()
    const title = await selected.locator('.cmp-list-row-title').textContent()
    const previousTitle = actor.recall<string>('selectedEntryTitle')
    expect(title?.trim()).not.toBe(previousTitle)
    actor.remember('selectedEntryTitle', title?.trim() ?? '')
  }
}
