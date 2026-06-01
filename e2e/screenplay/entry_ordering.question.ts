import { expect } from '@playwright/test'
import type { Actor, Answerable } from './actor.ability'

function normalizeMeta(text: string | null): string {
  return (text ?? '').replace(/\s*◷\s*/g, '').trim()
}

async function indexOfEntry(rows: ReturnType<Actor['page']['locator']>, name: string): Promise<number> {
  const count = await rows.count()
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i)
    const meta = normalizeMeta(await row.locator('.cmp-list-row-meta').textContent())
    const title = (await row.locator('.cmp-list-row-title').textContent())?.trim() ?? ''
    if (meta === name || title === name) return i
  }
  for (let i = 0; i < count; i++) {
    const text = (await rows.nth(i).textContent()) ?? ''
    if (text.includes(name)) return i
  }
  return -1
}

export class EntryOrderingAssertAbove implements Answerable {
  private constructor(
    private readonly a: string,
    private readonly b: string
  ) {}

  static named(a: string, b: string): EntryOrderingAssertAbove {
    return new EntryOrderingAssertAbove(a, b)
  }

  async answeredBy(actor: Actor): Promise<void> {
    await actor.eventually(async () => {
      const rows = actor.page.locator('button.cmp-list-row')
      const aIndex = await indexOfEntry(rows, this.a)
      const bIndex = await indexOfEntry(rows, this.b)
      expect(aIndex).toBeGreaterThanOrEqual(0)
      expect(bIndex).toBeGreaterThanOrEqual(0)
      expect(aIndex).toBeLessThan(bIndex)
    }, 30_000)
  }
}

export class EntryOrderingAssertBelow implements Answerable {
  private constructor(
    private readonly a: string,
    private readonly b: string
  ) {}

  static named(a: string, b: string): EntryOrderingAssertBelow {
    return new EntryOrderingAssertBelow(a, b)
  }

  async answeredBy(actor: Actor): Promise<void> {
    await actor.eventually(async () => {
      const rows = actor.page.locator('button.cmp-list-row')
      const aIndex = await indexOfEntry(rows, this.a)
      const bIndex = await indexOfEntry(rows, this.b)
      expect(aIndex).toBeGreaterThanOrEqual(0)
      expect(bIndex).toBeGreaterThanOrEqual(0)
      expect(aIndex).toBeGreaterThan(bIndex)
    }, 3_000)
  }
}
