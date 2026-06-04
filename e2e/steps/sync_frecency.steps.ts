import { EntryOrderingAssertAbove } from '../screenplay/entry_ordering.question'
import { RecordUsefulVisitsFor, SeedFrecencyLeader } from '../screenplay/frecency.task'
import { RunSync } from '../screenplay/sync.task'
import { Given, Then, When } from '../support/fixtures.support'

Given('I have opened some items several times', async ({ actor }) => {
  await actor.attemptsTo(SeedFrecencyLeader.named('Release Bookmark', 5))
  await actor.attemptsTo(RecordUsefulVisitsFor.for('Release Todo Task', 1))
})

When('I sync my files from disk', async ({ actor }) => {
  await actor.attemptsTo(RunSync.now())
})

Then('the items I use most still appear before the ones I rarely open', async ({ actor }) => {
  await actor.asksWhether(EntryOrderingAssertAbove.named('Release Bookmark', 'Release Todo Task'))
})
