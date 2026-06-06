import { EntryListAllMatchQuery } from '../screenplay/entry_list.question'
import { EntryOrderingAssertAbove } from '../screenplay/entry_ordering.question'
import {
  OpenDetailFor,
  RecordUsefulVisitsFor,
  RefreshListOrdering,
  RunPrimaryActionFor,
  SeedFrecencyLeader
} from '../screenplay/frecency.task'
import { EntryListExcludesTitle } from '../screenplay/task_crud.question'
import { Given, Then, When } from '../support/fixtures.support'

Given('{string} has the highest frecency score', async ({ actor }, title: string) => {
  await actor.attemptsTo(SeedFrecencyLeader.named(title, 2))
})

When('I open the detail for {string}', async ({ actor }, title: string) => {
  await actor.attemptsTo(OpenDetailFor.named(title))
})

When('I refresh the list', async ({ actor }) => {
  await actor.attemptsTo(RefreshListOrdering.now())
})

When('I record {int} useful visits for {string}', async ({ actor }, count: number, title: string) => {
  await actor.attemptsTo(RecordUsefulVisitsFor.for(title, count))
})

When('I run the primary action for {string}', async ({ actor }, title: string) => {
  await actor.attemptsTo(RunPrimaryActionFor.for(title))
})

Then('{string} ranks above {string}', async ({ actor }, a: string, b: string) => {
  await actor.asksWhether(EntryOrderingAssertAbove.named(a, b))
})

Then('the list shows entries matching {string}', async ({ actor }, query: string) => {
  await actor.asksWhether(EntryListAllMatchQuery.for(query))
})

Then('{string} is not shown unless it matches the search', async ({ actor }, title: string) => {
  await actor.asksWhether(EntryListExcludesTitle.named(title))
})
