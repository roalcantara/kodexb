import { ChooseTypeFilter, OpenFilterOverlay } from '../screenplay/filter_overlay.task'
import { SearchEntries } from '../screenplay/search_entries.task'
import { SyncReportsHardCollision } from '../screenplay/shortcuts_import.question'
import { WriteClashingGlobalBinding } from '../screenplay/shortcuts_import.task'
import {
  ChordDetailBackToKeymapIsSelected,
  ChordDetailIsVisible,
  ChordDetailShowsBindingsFor,
  EntryListIncludesShortcutEntry,
  EntryRowShowsShortcutGlyph,
  ShortcutKeymapBindingIsSelected,
  ShortcutKeymapHasBinding,
  ShortcutKeymapIsVisible
} from '../screenplay/shortcuts_keymap.question'
import {
  NavigateBackFromChordDetail,
  OpenChordDetailForSelectedBinding,
  OpenKeymapDetailForSelectedEntry,
  SelectKeymapBinding
} from '../screenplay/shortcuts_keymap.task'
import {
  ShortcutsOverlayAllRowsBelongToApp,
  ShortcutsOverlayChordCardFor,
  ShortcutsOverlayChordListsBindingsFor,
  ShortcutsOverlayFilterModalIsClosed,
  ShortcutsOverlayFilterModalIsOpen,
  ShortcutsOverlayIsClosed,
  ShortcutsOverlayIsOpen,
  ShortcutsOverlayRowHasHardCollision,
  ShortcutsOverlayRowWithAction,
  ShortcutsOverlaySearchIsFocused
} from '../screenplay/shortcuts_overlay.question'
import {
  DismissShortcutsOverlay,
  OpenShortcutsOverlay,
  OpenShortcutsOverlayFilterModal,
  SearchShortcutsByChord,
  SearchShortcutsByText,
  SelectShortcutsOverlayFilterApp
} from '../screenplay/shortcuts_overlay.task'
import { Given, Then, When } from '../support/fixtures.support'

// ── Import collision sync ─────────────────────────────────────────────────────

Given(
  'the fixture sources include a new global shortcut binding that clashes with an existing global',
  async ({ actor }) => {
    await actor.attemptsTo(WriteClashingGlobalBinding.now())
  }
)

Then('sync reports a hard collision for the clashing chord', async ({ actor }) => {
  await actor.asksWhether(SyncReportsHardCollision.forChord('cmd+space'))
})

// ── Overlay open / close ─────────────────────────────────────────────────────

When('I open the shortcuts quick-lookup overlay', async ({ actor }) => {
  await actor.attemptsTo(OpenShortcutsOverlay.now())
})

Then('the shortcuts quick-lookup overlay is open with search focused', async ({ actor }) => {
  await actor.asksWhether(ShortcutsOverlayIsOpen.now())
  await actor.asksWhether(ShortcutsOverlaySearchIsFocused.now())
})

When('I dismiss the shortcuts quick-lookup overlay', async ({ actor }) => {
  await actor.attemptsTo(DismissShortcutsOverlay.now())
})

Then('the shortcuts quick-lookup overlay is closed', async ({ actor }) => {
  await actor.asksWhether(ShortcutsOverlayIsClosed.now())
})

// ── Overlay text search ───────────────────────────────────────────────────────

When('I search shortcuts for {string}', async ({ actor }, query: string) => {
  await actor.attemptsTo(SearchShortcutsByText.for(query))
})

Then('the shortcuts overlay shows a row with action {string}', async ({ actor }, action: string) => {
  await actor.asksWhether(ShortcutsOverlayRowWithAction.named(action))
})

// ── Overlay chord search ──────────────────────────────────────────────────────

When('I search shortcuts by chord {string}', async ({ actor }, chord: string) => {
  await actor.attemptsTo(SearchShortcutsByChord.for(chord))
})

Then('the shortcuts overlay shows a conflicts card for {string}', async ({ actor }, chord: string) => {
  await actor.asksWhether(ShortcutsOverlayChordCardFor.for(chord))
})

Then(
  'the shortcuts overlay lists bindings for {string} and {string}',
  async ({ actor }, entry1: string, entry2: string) => {
    await actor.asksWhether(ShortcutsOverlayChordListsBindingsFor.forEntries(entry1, entry2))
  }
)

// ── Overlay collision glyph ───────────────────────────────────────────────────

Then('the shortcuts overlay row {string} shows a hard collision warning', async ({ actor }, action: string) => {
  await actor.asksWhether(ShortcutsOverlayRowHasHardCollision.forAction(action))
})

// ── Overlay filter modal ──────────────────────────────────────────────────────

When('I open the shortcuts overlay filter modal', async ({ actor }) => {
  await actor.attemptsTo(OpenShortcutsOverlayFilterModal.now())
})

Then('the shortcuts overlay filter modal is open', async ({ actor }) => {
  await actor.asksWhether(ShortcutsOverlayFilterModalIsOpen.now())
})

Then('the shortcuts overlay filter modal is closed', async ({ actor }) => {
  await actor.asksWhether(ShortcutsOverlayFilterModalIsClosed.now())
})

When('I select shortcuts overlay filter app {string}', async ({ actor }, appSlug: string) => {
  await actor.attemptsTo(SelectShortcutsOverlayFilterApp.named(appSlug))
})

Then('every visible shortcuts overlay row belongs to app {string}', async ({ actor }, appSlug: string) => {
  await actor.asksWhether(ShortcutsOverlayAllRowsBelongToApp.forApp(appSlug))
})

// ── List shortcuts ────────────────────────────────────────────────────────────

When('I filter the list by type {string}', async ({ actor }, type: string) => {
  await actor.attemptsTo(OpenFilterOverlay.now())
  await actor.page.waitForTimeout(500)
  await actor.attemptsTo(ChooseTypeFilter.named(type))
  await actor.page.keyboard.press('Escape')
  await actor.page.locator('.cmp-filter-stack').waitFor({ state: 'hidden', timeout: 10_000 })
})

Then('the list shows the {string} entry', async ({ actor }, title: string) => {
  await actor.asksWhether(EntryListIncludesShortcutEntry.named(title))
})

Then('the list row {string} shows the shortcut entry glyph', async ({ actor }, title: string) => {
  await actor.asksWhether(EntryRowShowsShortcutGlyph.forEntry(title))
})

When('I search the list for {string}', async ({ actor }, query: string) => {
  await actor.attemptsTo(OpenFilterOverlay.now())
  await actor.page.waitForTimeout(300)
  await actor.attemptsTo(ChooseTypeFilter.named('All entries'))
  await actor.page.keyboard.press('Escape')
  await actor.page.locator('.cmp-filter-stack').waitFor({ state: 'hidden', timeout: 10_000 })
  await actor.attemptsTo(SearchEntries.for(query))
})

// ── Keymap detail ─────────────────────────────────────────────────────────────

When('I open the keymap detail for the selected shortcut entry', async ({ actor }) => {
  await actor.attemptsTo(OpenKeymapDetailForSelectedEntry.now())
})

Then('the keymap detail is visible', async ({ actor }) => {
  await actor.asksWhether(ShortcutKeymapIsVisible.now())
})

When('I select keymap binding {string}', async ({ actor }, action: string) => {
  await actor.attemptsTo(SelectKeymapBinding.named(action))
})

Then('the keymap binding {string} is selected', async ({ actor }, action: string) => {
  await actor.asksWhether(ShortcutKeymapBindingIsSelected.named(action))
})

Then('the keymap binding {string} is visible', async ({ actor }, action: string) => {
  await actor.asksWhether(ShortcutKeymapHasBinding.forAction(action))
})

When('I open chord detail for the selected binding', async ({ actor }) => {
  await actor.attemptsTo(OpenChordDetailForSelectedBinding.now())
})

Then('the chord detail shows bindings for chord {string}', async ({ actor }, chord: string) => {
  await actor.asksWhether(ChordDetailShowsBindingsFor.forChord(chord))
})

Then('the chord detail is visible', async ({ actor }) => {
  await actor.asksWhether(ChordDetailIsVisible.now())
})

When('I navigate back from chord detail to keymap', async ({ actor }) => {
  await actor.attemptsTo(NavigateBackFromChordDetail.now())
})

Then('the keymap binding {string} is still selected', async ({ actor }, action: string) => {
  await actor.asksWhether(ChordDetailBackToKeymapIsSelected.forBinding(action))
})
