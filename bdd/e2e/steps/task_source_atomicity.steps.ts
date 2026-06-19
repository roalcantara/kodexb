import { expect } from '@playwright/test'
import type { TaskMutationOutcome } from '@shared/rpc'
import type { Actor } from '../screenplay/actor.ability'
import { Given, Then } from '../support/fixtures.support'

const LAST_TASK_MUTATION_OUTCOME = 'lastTaskMutationOutcome'
const SEEN_TASK_MUTATION_CORRELATION_IDS = 'seenTaskMutationCorrelationIds'

type StoredTaskMutationOutcome = TaskMutationOutcome<unknown>

function recallTaskMutationOutcome(actor: Actor): StoredTaskMutationOutcome {
  return actor.recall<StoredTaskMutationOutcome>(LAST_TASK_MUTATION_OUTCOME)
}

async function setE2eFaultMode(page: import('@playwright/test').Page, mode: string): Promise<void> {
  const baseUrl = `http://localhost:${process.env.PREVIEW_PORT ?? '3456'}`
  const resp = await page.request.post(`${baseUrl}/api/e2e/fault-mode`, {
    data: { mode }
  })
  if (!resp.ok()) {
    throw new Error(
      'e2e/fault-mode endpoint not available. Start preview server with:\n' +
        '  KB_E2E_FAULT_INJECTION=1 bun packages/dev/src/preview/server.script.ts'
    )
  }
}

Given('task source persistence is unavailable', async ({ actor, page }) => {
  await setE2eFaultMode(page, 'source_write_failed')
  actor.remember('expectMutationFailure', true)

  const mutationPaths = [
    '/api/createTask',
    '/api/updateTask',
    '/api/deleteTask',
    '/api/cycleStatus',
    '/api/cyclePriority',
    '/api/reorderTask'
  ]
  page.on('response', response => {
    const url = new URL(response.url())
    if (mutationPaths.includes(url.pathname) && response.ok()) {
      response
        .json()
        .then(body => {
          if (body && 'ok' in body) {
            actor.remember(LAST_TASK_MUTATION_OUTCOME, body)
          }
        })
        .catch(() => {
          /* intentionally silent — response observed best-effort */
        })
    }
  })
})

Given('task mutation source version is stale', async ({ actor, page }) => {
  await setE2eFaultMode(page, 'off')
  actor.remember('expectMutationFailure', true)

  const selectedRow = page.locator('button.cmp-list-row--selected')
  const idAttr = await selectedRow.getAttribute('data-entry-id')
  if (!idAttr) throw new Error('Could not find data-entry-id on selected task row')
  const taskId = Number(idAttr)
  if (!Number.isFinite(taskId)) throw new Error(`Invalid task ID: ${idAttr}`)

  const baseUrl = `http://localhost:${process.env.PREVIEW_PORT ?? '3456'}`
  const ageResp = await page.request.post(`${baseUrl}/api/updateTask`, {
    data: { id: taskId, patch: { desc: 'Age task for conflict (e2e setup)' } }
  })
  const ageBody = await ageResp.json()
  if (!ageBody.ok) throw new Error(`Failed to age task ${taskId}: ${ageBody.message}`)
  actor.remember(LAST_TASK_MUTATION_OUTCOME, ageBody)
})

Then('the task sheet shows the error {string}', async ({ page }, expectedError: string) => {
  const errorRegion = page.locator('[data-testid="task-sheet-error"]')
  await expect(errorRegion).toBeVisible({ timeout: 5_000 })
  await expect(errorRegion).toContainText(expectedError)
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
