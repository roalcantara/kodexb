import { EntryOrderingAssertAbove, EntryOrderingAssertBelow } from '../screenplay/entry_ordering.question'
import { ChooseTypeFilter, OpenFilterOverlay } from '../screenplay/filter_overlay.task'
import { SelectEntryByTitle } from '../screenplay/select_entry.task'
import {
  EntryListExcludesTitle,
  EntryListIncludesTitle,
  FixtureSourcesTaskFileExcludes,
  FixtureSourcesTaskFileIncludes,
  TaskDetailShowsNextFieldValue
} from '../screenplay/task_crud.question'
import { CreateTask, CycleTaskField, DeleteTask, EditTaskDescription, ReorderTask } from '../screenplay/task_crud.task'
import { Given, Then, When } from '../support/fixtures.support'

Given('I select the {string} task', async ({ actor }, title: string) => {
  await actor.attemptsTo(SelectEntryByTitle.named(title))
})

Given('I am viewing task entries', async ({ actor }) => {
  await actor.attemptsTo(OpenFilterOverlay.now())
  await actor.attemptsTo(ChooseTypeFilter.named('task'))
  await actor.page.keyboard.press('Escape')
  await actor.page.waitForTimeout(200)
})

Given('{string} is below {string}', async ({ actor }, a: string, b: string) => {
  await actor.asksWhether(EntryOrderingAssertBelow.named(a, b))
})

When('I create a task named {string}', async ({ actor }, name: string) => {
  await actor.attemptsTo(CreateTask.named(name))
})

When('I change the task description to {string}', async ({ actor }, text: string) => {
  await actor.attemptsTo(EditTaskDescription.to(text))
})

When('I cycle the task {word}', async ({ actor }, field: string) => {
  await actor.attemptsTo(CycleTaskField.named(field))
})

When('I move {string} upward', async ({ actor }, title: string) => {
  await actor.attemptsTo(ReorderTask.upward(title))
})

When('I delete the {string} task', async ({ actor }, title: string) => {
  await actor.attemptsTo(DeleteTask.named(title))
})

Then('the task list includes {string}', async ({ actor }, name: string) => {
  await actor.asksWhether(EntryListIncludesTitle.named(name))
})

Then('the fixture task source includes {string}', async ({ actor }, text: string) => {
  await actor.asksWhether(FixtureSourcesTaskFileIncludes.named(text))
})

Then('the selected task shows the next {word} value', async ({ actor }, field: string) => {
  await actor.asksWhether(TaskDetailShowsNextFieldValue.named(field))
})

Then('{string} appears above {string}', async ({ actor }, a: string, b: string) => {
  await actor.asksWhether(EntryOrderingAssertAbove.named(a, b))
})

Then('the task list does not include {string}', async ({ actor }, name: string) => {
  await actor.asksWhether(EntryListExcludesTitle.named(name))
})

Then('the fixture task source does not include {string}', async ({ actor }, text: string) => {
  await actor.asksWhether(FixtureSourcesTaskFileExcludes.named(text))
})
