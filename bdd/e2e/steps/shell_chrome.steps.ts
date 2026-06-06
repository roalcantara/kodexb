import { expect } from '@playwright/test'

import { Then } from '../support/fixtures.support'

Then('the knowledge list does not show a Sync toolbar button', async ({ actor }) => {
  await expect(actor.page.locator('.cmp-toolbar--quick-actions')).toHaveCount(0)
  await expect(actor.page.getByRole('button', { name: /^↺ Sync$/ })).toHaveCount(0)
})
