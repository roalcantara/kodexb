import { ActionToastIsError, ActionToastIsSuccess, ActionToastIsSuccessFor } from '../screenplay/action_toast.question'
import { RunSecondaryAction } from '../screenplay/entry_actions.task'
import { EntryListSurfaceVisible } from '../screenplay/entry_list.question'
import {
  FooterHandoffNoSecondary,
  FooterHandoffPrimaryLabel,
  FooterHandoffSecondaryLabel
} from '../screenplay/footer_handoff.question'
import {
  HandoffNoSuccessfulOpenExternal,
  HandoffReceivedOpenExternal,
  HandoffReceivedOpenInEditor,
  HandoffReceivedPasteDoc,
  HandoffReceivedPasteInTerminal,
  HandoffReceivedRunInTerminal
} from '../screenplay/handoff_api.question'
import { HandoffIntercept } from '../screenplay/handoff_intercept.task'
import { PressShortcut } from '../screenplay/press_shortcut.interaction'
import { Given, Then, When } from '../support/fixtures.support'

Given('the e2e handoff API intercept is active', async ({ actor }) => {
  await actor.attemptsTo(HandoffIntercept.activate())
})

Given('external handoff is stubbed to fail', async ({ actor }) => {
  await actor.attemptsTo(HandoffIntercept.stubFailure())
})

Then('the footer primary action is {string}', async ({ actor }, label: string) => {
  await actor.asksWhether(FooterHandoffPrimaryLabel.is(label))
})

Then('the footer secondary action is {string}', async ({ actor }, label: string) => {
  await actor.asksWhether(FooterHandoffSecondaryLabel.is(label))
})

Then('the footer does not show a secondary action', async ({ actor }) => {
  await actor.asksWhether(FooterHandoffNoSecondary.now())
})

When('I run the secondary action', async ({ actor }) => {
  await actor.attemptsTo(RunSecondaryAction.forSelectedEntry())
})

When('I press the copy title shortcut', async ({ actor }) => {
  await actor.attemptsTo(PressShortcut.named('Meta+c'))
})

When('I press the copy description shortcut', async ({ actor }) => {
  await actor.attemptsTo(PressShortcut.named('Meta+Alt+c'))
})

When('I press the open source shortcut', async ({ actor }) => {
  const listbox = actor.page.getByRole('listbox', { name: 'Entries' })
  await listbox.focus()
  await actor.attemptsTo(PressShortcut.named('Meta+o'))
})

Then('the handoff API receives an open external request for {string}', async ({ actor }, url: string) => {
  await actor.asksWhether(HandoffReceivedOpenExternal.with(url))
})

Then('the handoff API receives a paste in terminal request containing {string}', async ({ actor }, text: string) => {
  await actor.asksWhether(HandoffReceivedPasteInTerminal.containing(text))
})

Then('the handoff API receives a run in terminal request containing {string}', async ({ actor }, text: string) => {
  await actor.asksWhether(HandoffReceivedRunInTerminal.containing(text))
})

Then('the handoff API receives a paste doc handoff request', async ({ actor }) => {
  await actor.asksWhether(HandoffReceivedPasteDoc.now())
})

Then('the handoff API receives an open in editor request', async ({ actor }) => {
  await actor.asksWhether(HandoffReceivedOpenInEditor.now())
})

Then('the handoff API received no successful open external response', async ({ actor }) => {
  await actor.asksWhether(HandoffNoSuccessfulOpenExternal.now())
})

Then('a success action toast is shown', async ({ actor }) => {
  await actor.asksWhether(ActionToastIsSuccess.now())
})

Then('a success action toast is shown for copy title', async ({ actor }) => {
  await actor.asksWhether(ActionToastIsSuccessFor.with('Title copied'))
})

Then('a success action toast is shown for copy description', async ({ actor }) => {
  await actor.asksWhether(ActionToastIsSuccessFor.with('Description copied'))
})

Then('an error action toast is shown', async ({ actor }) => {
  await actor.asksWhether(ActionToastIsError.now())
})

Then('the knowledge list surface is visible', async ({ actor }) => {
  await actor.asksWhether(EntryListSurfaceVisible.now())
})
