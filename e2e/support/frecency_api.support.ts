import type { Page } from '@playwright/test'

type ListRow = {
  id: number
  desc: string
  frecencyScore: number
  visitCount: number
}

function previewOrigin(page: Page): string {
  return new URL(page.url()).origin
}

export async function entryIdForTitle(page: Page, title: string): Promise<number> {
  const row = page.locator('button.cmp-list-row', { hasText: title }).first()
  const id = await row.getAttribute('data-entry-id')
  if (!id) throw new Error(`No data-entry-id for list row "${title}"`)
  return Number(id)
}

export async function fetchListRows(page: Page): Promise<ListRow[]> {
  const res = await fetch(`${previewOrigin(page)}/api/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: 200 })
  })
  if (!res.ok) throw new Error(`list failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as ListRow[]
}

export async function listEntryFrecency(
  page: Page,
  entryId: number
): Promise<{ frecencyScore: number; visitCount: number }> {
  const row = (await fetchListRows(page)).find(r => r.id === entryId)
  if (!row) throw new Error(`Entry id ${entryId} not found in /api/list`)
  return { frecencyScore: row.frecencyScore, visitCount: row.visitCount }
}

export async function recordEntryVisitAt(page: Page, entryId: number): Promise<void> {
  const res = await fetch(`${previewOrigin(page)}/api/recordEntryVisit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: entryId })
  })
  if (!res.ok) throw new Error(`recordEntryVisit failed: ${res.status} ${await res.text()}`)
}
