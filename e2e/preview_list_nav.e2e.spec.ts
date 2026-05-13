import { expect, test } from '@playwright/test'

/**
 * Smoke: real renderer bundle + RPC (see `tools/preview/server.ts`), Chromium only.
 * Requires a non-empty list (at least one row). Empty DB → skipped (not a failure).
 */
test.describe('preview list / split / detail navigation', () => {
  test('ArrowRight twice then ArrowLeft twice matches Powertoys layout classes', async ({ page }) => {
    await page.goto('/')

    const entries = page.getByRole('listbox', { name: 'Entries' })
    await entries.waitFor({ state: 'visible', timeout: 120_000 })

    const rowCount = await page.locator('.kb-pt-row').count()
    test.skip(rowCount === 0, 'Preview has no list rows; seed the DB or sync sources to run this smoke.')

    await entries.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.kb-pt-list-panel--narrow')).toBeVisible()

    await page.keyboard.press('ArrowRight')
    // Panel keeps `--hidden` in DOM; CSS is `display: none` — not compatible with toBeVisible().
    await expect(page.locator('.kb-pt-list-panel--hidden')).toBeHidden()
    await expect(page.locator('.kb-pt-detail--full')).toBeVisible()
    await expect(page.getByRole('search')).toBeHidden()

    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('.kb-pt-list-panel--narrow')).toBeVisible()
    await expect(page.locator('.kb-pt-list-panel--hidden')).toHaveCount(0)
    await expect(page.getByRole('search')).toBeVisible()

    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('.kb-pt-detail')).toHaveCount(0)
    await expect(page.locator('.kb-pt-list-panel--narrow')).toHaveCount(0)
  })
})
