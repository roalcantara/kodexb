import { expect } from '@playwright/test'
import type { TaskMutationOutcome } from '@shared/rpc'
import type { Actor } from '../screenplay/actor.ability'
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

const LAST_TASK_MUTATION_OUTCOME = 'lastTaskMutationOutcome'
const SEEN_TASK_MUTATION_CORRELATION_IDS = 'seenTaskMutationCorrelationIds'

type StoredTaskMutationOutcome = TaskMutationOutcome<unknown>

async function interceptTaskMutation(
  actor: Actor,
  pathSuffix: '/api/createTask' | '/api/updateTask',
  buildOutcome: (body: Record<string, unknown>) => StoredTaskMutationOutcome
): Promise<void> {
  await actor.page.route(`**${pathSuffix}`, async route => {
    const body = (route.request().postDataJSON() as Record<string, unknown> | null) ?? {}
    const outcome = buildOutcome(body)
    actor.remember(LAST_TASK_MUTATION_OUTCOME, outcome)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(outcome)
    })
  })
}

function recallTaskMutationOutcome(actor: Actor): StoredTaskMutationOutcome {
  return actor.recall<StoredTaskMutationOutcome>(LAST_TASK_MUTATION_OUTCOME)
}

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

Given('task source persistence is unavailable', async ({ actor }) => {
  await interceptTaskMutation(actor, '/api/createTask', () => ({
    ok: false,
    status: 'source_write_failed',
    operation: 'create',
    message: 'Task create could not write to source.',
    details: {
      correlationId: globalThis.crypto.randomUUID()
    }
  }))
})

Given('task mutation source version is stale', async ({ actor }) => {
  await interceptTaskMutation(actor, '/api/updateTask', body => {
    const taskId = typeof body.id === 'number' ? body.id : undefined
    const currentSourceVersion = Date.now()
    const requestSourceVersion = currentSourceVersion - 1
    return {
      ok: false,
      status: 'conflict',
      operation: 'update',
      taskId,
      sourceVersion: currentSourceVersion,
      message: 'Task update rejected due to version conflict.',
      details: {
        correlationId: globalThis.crypto.randomUUID(),
        currentSourceVersion,
        requestSourceVersion
      }
    }
  })
})

Then('the latest task mutation outcome status is {string}', async ({ actor }, status: string) => {
  const outcome = recallTaskMutationOutcome(actor)
  expect(outcome.status).toBe(status)
})

Then('mutation diagnostics include operation {string}', async ({ actor }, operation: string) => {
  const outcome = recallTaskMutationOutcome(actor)
  expect(outcome.operation).toBe(operation)
  expect(outcome.ok).toBe(false)
})

Then('mutation diagnostics include a unique correlation id', async ({ actor }) => {
  const outcome = recallTaskMutationOutcome(actor)
  const correlationId = outcome.ok ? undefined : outcome.details?.correlationId
  expect(correlationId).toEqual(expect.any(String))
  const seen = actor.recall<string[]>(SEEN_TASK_MUTATION_CORRELATION_IDS) ?? []
  expect(seen).not.toContain(correlationId)
  actor.remember(SEEN_TASK_MUTATION_CORRELATION_IDS, [...seen, correlationId])
})
