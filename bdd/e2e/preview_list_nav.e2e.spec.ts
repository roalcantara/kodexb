import { expect, test } from '@playwright/test'

/**
 * Smoke: real renderer bundle + RPC (see `packages/dev/src/preview/server.script.ts`), Chromium only.
 * Requires a non-empty list (at least one row). Empty DB → skipped (not a failure).
 *
 * DOM contract (kept in sync with `src/shell/renderer/components/list/`):
 *   - listbox container        : `[role="listbox"][aria-label="Entries"]` (theme-results)
 *   - each row                 : `button[data-entry-id]` (theme-list-row | theme-entry-row)
 *   - split list pane          : `.theme-list-panel` + `.theme-list-panel--narrow`
 *   - detail-full hidden list  : `.theme-list-panel--hidden`
 *   - detail-full pane         : `.theme-detail--full`
 *   - detail (any state)       : `.theme-detail`
 *   - search landmark          : <search> (matched by role="search")
 */
test.describe('preview list / split / detail navigation', () => {
  test('ArrowRight twice then ArrowLeft twice cycles split → detail-full → split → list', async ({ page }) => {
    await page.goto('/')

    const entries = page.getByRole('listbox', { name: 'Entries' })
    await entries.waitFor({ state: 'visible', timeout: 120_000 })

    // The listbox renders before the RPC `/api/list` response resolves; wait
    // for at least one row to attach (or give up after 15s → skip) so the
    // nav assertions don't run against an empty list state.
    const firstRow = page.locator('button[data-entry-id]').first()
    const hasRows = await firstRow
      .waitFor({ state: 'attached', timeout: 15_000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!hasRows, 'Preview has no list rows; seed the DB or sync sources to run this smoke.')

    await entries.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.theme-list-panel--narrow')).toBeVisible()

    await page.keyboard.press('ArrowRight')
    // Panel keeps `--hidden` in DOM; CSS is `display: none` — not compatible with toBeVisible().
    await expect(page.locator('.theme-list-panel--hidden')).toBeHidden()
    await expect(page.locator('.theme-detail--full')).toBeVisible()
    await expect(page.getByRole('search')).toBeHidden()

    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('.theme-list-panel--narrow')).toBeVisible()
    await expect(page.locator('.theme-list-panel--hidden')).toHaveCount(0)
    await expect(page.getByRole('search')).toBeVisible()

    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('.theme-detail')).toHaveCount(0)
    await expect(page.locator('.theme-list-panel--narrow')).toHaveCount(0)
  })
})
