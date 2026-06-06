import {
  CommandPaletteAllActionsMatch,
  CommandPaletteHidesSection,
  CommandPaletteIsClosed,
  CommandPaletteShowsSection,
  EntryListIsReadyForKeyboard
} from '../screenplay/command_palette.question'
import {
  ClearListSelection,
  DismissCommandPalette,
  OpenCommandPalette,
  SearchPaletteActions
} from '../screenplay/command_palette.task'
import { Given, Then, When } from '../support/fixtures.support'

Given('no list row is selected', async ({ actor }) => {
  await actor.attemptsTo(ClearListSelection.now())
})

When('I open the command palette', async ({ actor }) => {
  await actor.attemptsTo(OpenCommandPalette.now())
})

When('I search palette actions for {string}', async ({ actor }, query: string) => {
  await actor.attemptsTo(SearchPaletteActions.for(query))
})

When('I dismiss the command palette', async ({ actor }) => {
  await actor.attemptsTo(DismissCommandPalette.now())
})

Then('the palette shows the {string} section', async ({ actor }, section: string) => {
  await actor.asksWhether(CommandPaletteShowsSection.named(section))
})

Then('the palette does not show the {string} section', async ({ actor }, section: string) => {
  await actor.asksWhether(CommandPaletteHidesSection.named(section))
})

Then('every visible palette action matches {string}', async ({ actor }, query: string) => {
  await actor.asksWhether(CommandPaletteAllActionsMatch.for(query))
})

Then('the command palette is closed', async ({ actor }) => {
  await actor.asksWhether(CommandPaletteIsClosed.now())
})

Then('the knowledge list is ready for keyboard navigation', async ({ actor }) => {
  await actor.asksWhether(EntryListIsReadyForKeyboard.now())
})
