import {
  EntryListAllHaveTag,
  EntryListAllHaveType,
  EntryListAllMatchQuery,
  EntryListAllTasksInView
} from '../screenplay/entry_list.question'
import {
  ChooseTagFilter,
  ChooseTaskViewFilter,
  ChooseTypeFilter,
  OpenFilterOverlay
} from '../screenplay/filter_overlay.task'
import { FilterSummaryIncludes } from '../screenplay/filter_summary.question'
import { FooterReportsFilteredCount } from '../screenplay/footer.question'
import { SearchEntries } from '../screenplay/search_entries.task'
import { Then, When } from '../support/fixtures.support'

When('I search for {string}', async ({ actor }, query: string) => {
  await actor.attemptsTo(SearchEntries.for(query))
})

When('I open the filter overlay', async ({ actor }) => {
  await actor.attemptsTo(OpenFilterOverlay.now())
})

When('I choose the {string} type filter', async ({ actor }, type: string) => {
  await actor.attemptsTo(ChooseTypeFilter.named(type))
})

When('I choose the {string} tag filter', async ({ actor }, tag: string) => {
  await actor.attemptsTo(ChooseTagFilter.named(tag))
})

When('I choose the {string} task view filter', async ({ actor }, view: string) => {
  await actor.attemptsTo(ChooseTaskViewFilter.named(view))
})

Then('I see only entries matching {string}', async ({ actor }, query: string) => {
  await actor.asksWhether(EntryListAllMatchQuery.for(query))
})

Then('the footer reports the filtered result count', async ({ actor }) => {
  await actor.asksWhether(FooterReportsFilteredCount.now())
})

Then('every visible entry has type {string}', async ({ actor }, type: string) => {
  await actor.asksWhether(EntryListAllHaveType.named(type))
})

Then('the active filter summary includes {string}', async ({ actor }, type: string) => {
  await actor.asksWhether(FilterSummaryIncludes.named(type))
})

Then('every visible entry matches {string}', async ({ actor }, query: string) => {
  await actor.asksWhether(EntryListAllMatchQuery.for(query))
})

Then('every visible entry includes the {string} tag', async ({ actor }, tag: string) => {
  await actor.asksWhether(EntryListAllHaveTag.named(tag))
})

Then('every visible task belongs to the {string} task view', async ({ actor }, view: string) => {
  await actor.asksWhether(EntryListAllTasksInView.named(view))
})
