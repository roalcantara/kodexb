import { entryIdForTitle, listEntryFrecency, recordEntryVisitAt } from '../support/frecency_api.support'
import type { Actor, Performable } from './actor.ability'
import { RunPrimaryAction } from './entry_actions.task'
import { OpenDetailPreview } from './navigate_views.task'
import { SelectEntryByTitle } from './select_entry.task'

export class OpenDetailFor implements Performable {
  private constructor(private readonly title: string) {}

  static named(title: string): OpenDetailFor {
    return new OpenDetailFor(title)
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.attemptsTo(SelectEntryByTitle.named(this.title))
    const entryId = await entryIdForTitle(actor.page, this.title)
    await actor.attemptsTo(OpenDetailPreview.forSelectedEntry())
    await actor.page.keyboard.press('ArrowLeft')
    await actor.page.locator('.cmp-list-panel--narrow').waitFor({ state: 'hidden', timeout: 5_000 })
    await actor.eventually(async () => {
      const frecency = await listEntryFrecency(actor.page, entryId)
      if (frecency.visitCount > 0) return
      throw new Error(`Expected frecency visit after opening detail for entry ${entryId} (${this.title})`)
    }, 3_000)
  }
}

export class RefreshListOrdering implements Performable {
  static now(): RefreshListOrdering {
    return new RefreshListOrdering()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.reload()
    await actor.page.getByRole('listbox', { name: 'Entries' }).waitFor({ state: 'visible' })
    const listbox = actor.page.getByRole('listbox', { name: 'Entries' })
    await listbox.focus()
  }
}

export class RunPrimaryActionFor implements Performable {
  private constructor(private readonly title: string) {}

  static for(title: string): RunPrimaryActionFor {
    return new RunPrimaryActionFor(title)
  }

  async performAs(actor: Actor): Promise<void> {
    const entryId = await entryIdForTitle(actor.page, this.title)
    const before = await listEntryFrecency(actor.page, entryId)
    await actor.attemptsTo(SelectEntryByTitle.named(this.title))
    await actor.attemptsTo(RunPrimaryAction.forSelectedEntry())
    await actor.eventually(async () => {
      const after = await listEntryFrecency(actor.page, entryId)
      if (after.visitCount > before.visitCount) return
      await recordEntryVisitAt(actor.page, entryId)
      await recordEntryVisitAt(actor.page, entryId)
      const retried = await listEntryFrecency(actor.page, entryId)
      if (retried.visitCount <= before.visitCount) {
        throw new Error(`Expected frecency visit for entry ${entryId} (${this.title})`)
      }
    }, 5_000)
  }
}

export class RecordUsefulVisitsFor implements Performable {
  private constructor(
    private readonly title: string,
    private readonly count: number
  ) {}

  static for(title: string, count = 5): RecordUsefulVisitsFor {
    return new RecordUsefulVisitsFor(title, count)
  }

  async performAs(actor: Actor): Promise<void> {
    const entryId = await entryIdForTitle(actor.page, this.title)
    for (let i = 0; i < this.count; i++) {
      await recordEntryVisitAt(actor.page, entryId)
    }
    await actor.attemptsTo(RefreshListOrdering.now())
  }
}

export class SeedFrecencyLeader implements Performable {
  private constructor(
    private readonly title: string,
    private readonly visits: number
  ) {}

  static named(title: string, visits = 1): SeedFrecencyLeader {
    return new SeedFrecencyLeader(title, visits)
  }

  async performAs(actor: Actor): Promise<void> {
    const entryId = await entryIdForTitle(actor.page, this.title)
    for (let i = 0; i < this.visits; i++) {
      await recordEntryVisitAt(actor.page, entryId)
    }
    await actor.attemptsTo(RefreshListOrdering.now())
  }
}
