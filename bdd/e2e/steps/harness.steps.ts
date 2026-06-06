import { readFileSync } from 'node:fs'
import { FIXTURE_PATHS_FILE, Given } from '../support/fixtures.support'
import type { FixturePaths } from '../support/seed_fixture.support'

function loadFixturePaths(): FixturePaths {
  return JSON.parse(readFileSync(FIXTURE_PATHS_FILE, 'utf-8'))
}

async function reseedDatabase(baseUrl: string, paths: FixturePaths): Promise<void> {
  const res = await fetch(`${baseUrl}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourcesDir: paths.sourcesPath, skipLearnedRestore: true })
  })
  if (!res.ok) throw new Error(`Reseed sync failed: ${res.status} ${await res.text()}`)
}

Given('the app is running with the release e2e fixture', async ({ page, baseURL }) => {
  const paths = loadFixturePaths()
  const syncUrl = `${baseURL}/api/sync`
  const res = await fetch(syncUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourcesDir: paths.sourcesPath })
  })
  if (!res.ok) throw new Error(`Sync failed: ${res.status} ${await res.text()}`)

  await page.goto('/')
  const listbox = page.getByRole('listbox', { name: 'Entries' })
  await listbox.waitFor({ state: 'visible', timeout: 30_000 })
  await page.locator('button[data-entry-id]').first().waitFor({ state: 'attached', timeout: 15_000 })
})

Given('the release fixture is re-synced', async ({ page, baseURL }) => {
  const paths = loadFixturePaths()
  if (!baseURL) throw new Error('Playwright baseURL is required for fixture re-sync')
  await reseedDatabase(baseURL, paths)
  await page.reload()
  await page.getByRole('listbox', { name: 'Entries' }).waitFor({ state: 'visible', timeout: 30_000 })
})
