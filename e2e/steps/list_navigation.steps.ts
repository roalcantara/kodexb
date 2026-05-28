import { DetailPanelIsHidden, DetailPanelMatchesSelectedEntry } from '../screenplay/detail_panel.question'
import { EntryListIncludesType, EntryListSelectedRowChanged } from '../screenplay/entry_list.question'
import {
  ExpandDetailView,
  OpenDetailPreview,
  ReturnToListView,
  ReturnToSplitView
} from '../screenplay/navigate_views.task'
import { SearchFieldIsFocused } from '../screenplay/search_field.question'
import { SelectFirstEntry, SelectNextEntry } from '../screenplay/select_entry.task'
import { ViewKnowledgeList } from '../screenplay/view_knowledge_list.task'
import { Given, Then, When } from '../support/fixtures.support'

Given('I am viewing the knowledge list', async ({ actor }) => {
  await actor.attemptsTo(ViewKnowledgeList.now())
})

When('I move to the first entry', async ({ actor }) => {
  await actor.attemptsTo(SelectFirstEntry.now())
})

When('I move to the next entry', async ({ actor }) => {
  await actor.attemptsTo(SelectNextEntry.now())
})

When('I open the detail preview', async ({ actor }) => {
  await actor.attemptsTo(OpenDetailPreview.forSelectedEntry())
})

When('I expand the detail view', async ({ actor }) => {
  await actor.attemptsTo(ExpandDetailView.now())
})

When('I return to the split view', async ({ actor }) => {
  await actor.attemptsTo(ReturnToSplitView.now())
})

When('I return to the list view', async ({ actor }) => {
  await actor.attemptsTo(ReturnToListView.now())
})

Then('I see a bookmark entry', async ({ actor }) => {
  await actor.asksWhether(EntryListIncludesType.named('bookmark'))
})

Then('I see a command entry', async ({ actor }) => {
  await actor.asksWhether(EntryListIncludesType.named('command'))
})

Then('I see a cheat entry', async ({ actor }) => {
  await actor.asksWhether(EntryListIncludesType.named('cheat'))
})

Then('I see a task entry', async ({ actor }) => {
  await actor.asksWhether(EntryListIncludesType.named('task'))
})

Then('the list search is focused', async ({ actor }) => {
  await actor.asksWhether(SearchFieldIsFocused.now())
})

Then('no detail panel is visible', async ({ actor }) => {
  await actor.asksWhether(DetailPanelIsHidden.now())
})

Then('the selected row changes', async ({ actor }) => {
  await actor.asksWhether(EntryListSelectedRowChanged.now())
})

Then('the detail panel shows the selected entry', async ({ actor }) => {
  await actor.asksWhether(DetailPanelMatchesSelectedEntry.now())
})
