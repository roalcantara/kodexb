import {
  ActionFeedbackClipboardCopied,
  ActionFeedbackSourceTargetsFixture,
  ActionFeedbackSucceeded
} from '../screenplay/action_feedback.question'
import {
  DetailPanelShowsNotes,
  DetailPanelShowsSource,
  DetailPanelShowsTags,
  DetailPanelShowsTitle
} from '../screenplay/detail_panel.question'
import { CopySelectedEntry, OpenSelectedEntrySource, RunPrimaryAction } from '../screenplay/entry_actions.task'
import { SelectEntryByTitle } from '../screenplay/select_entry.task'
import { Given, Then, When } from '../support/fixtures.support'

Given('I select the {string} entry', async ({ actor }, title: string) => {
  await actor.attemptsTo(SelectEntryByTitle.named(title))
})

When('I run the primary action', async ({ actor }) => {
  await actor.attemptsTo(RunPrimaryAction.forSelectedEntry())
})

When('I copy the selected entry', async ({ actor }) => {
  await actor.attemptsTo(CopySelectedEntry.now())
})

When('I open the selected entry source', async ({ actor }) => {
  await actor.attemptsTo(OpenSelectedEntrySource.now())
})

Then('the detail panel shows {string}', async ({ actor }, title: string) => {
  await actor.asksWhether(DetailPanelShowsTitle.named(title))
})

Then('the detail panel shows its source', async ({ actor }) => {
  await actor.asksWhether(DetailPanelShowsSource.now())
})

Then('the detail panel shows its tags', async ({ actor }) => {
  await actor.asksWhether(DetailPanelShowsTags.now())
})

Then('the detail panel shows its notes', async ({ actor }) => {
  await actor.asksWhether(DetailPanelShowsNotes.now())
})

Then('I see a successful action result for {string}', async ({ actor }, title: string) => {
  await actor.asksWhether(ActionFeedbackSucceeded.for(title))
})

Then('the clipboard action reports the copied {string} content', async ({ actor }, title: string) => {
  await actor.asksWhether(ActionFeedbackClipboardCopied.for(title))
})

Then('the source action targets the fixture source file', async ({ actor }) => {
  await actor.asksWhether(ActionFeedbackSourceTargetsFixture.now())
})
