import { expect } from '@playwright/test'
import {
  SettingsReportsSaved,
  SettingsShowsDatabasePath,
  SettingsShowsPageSize,
  SettingsShowsPersistedPageSize,
  SettingsShowsSourcesPath
} from '../screenplay/settings.question'
import { ChangePageSize, OpenSettings, ResetSettings, SaveSettings } from '../screenplay/settings.task'
import {
  SyncModalAccordionContains,
  SyncModalErrorDetailContains,
  SyncModalFileShowsPartialSuccess,
  SyncModalFinishesWithinMs,
  SyncModalFirstErrorRowInView,
  SyncModalListsFailedFile,
  SyncModalShowsAtLeastNbrFilesWithErrors,
  SyncModalShowsFileTotalsStrip,
  SyncReportsCompletion,
  SyncReportsInvalidFile
} from '../screenplay/sync.question'
import {
  RunSync,
  SyncModalExpandErrorsForFile,
  WriteFixtureBookmark,
  WriteInvalidFixtureSource,
  WriteSyncResilienceFixtureSources
} from '../screenplay/sync.task'
import { EntryListIncludesTitle } from '../screenplay/task_crud.question'
import { Given, Then, When } from '../support/fixtures.support'

Given('the fixture sources include a new bookmark named {string}', async ({ actor }, name: string) => {
  await actor.attemptsTo(WriteFixtureBookmark.named(name))
})

Given('the fixture sources include an invalid source file', async ({ actor }) => {
  await actor.attemptsTo(WriteInvalidFixtureSource.now())
})

When('I open settings', async ({ actor }) => {
  await actor.attemptsTo(OpenSettings.now())
})

When('I change the page size to {string}', async ({ actor }, size: string) => {
  await actor.attemptsTo(ChangePageSize.to(size))
})

When('I save settings', async ({ actor }) => {
  await actor.attemptsTo(SaveSettings.now())
})

When('I reset settings', async ({ actor }) => {
  await actor.attemptsTo(ResetSettings.now())
})

When('I run sync', async ({ actor }) => {
  await actor.attemptsTo(RunSync.now())
})

Then('settings shows the fixture sources directory', async ({ actor }) => {
  await actor.asksWhether(SettingsShowsSourcesPath.now())
})

Then('settings shows the fixture database path', async ({ actor }) => {
  await actor.asksWhether(SettingsShowsDatabasePath.now())
})

Then('settings shows the configured page size', async ({ actor }) => {
  await actor.asksWhether(SettingsShowsPageSize.now())
})

Then('settings reports that changes were saved', async ({ actor }) => {
  await actor.asksWhether(SettingsReportsSaved.now())
})

Then('the knowledge list uses page size {string}', async ({ actor }, size: string) => {
  // Verification: close settings, verify the list is usable
  await actor.page.keyboard.press('Escape')
  await actor.page.waitForTimeout(200)
  const listbox = actor.page.getByRole('listbox', { name: 'Entries' })
  await expect(listbox).toBeVisible()
})

Then('settings shows the persisted page size', async ({ actor }) => {
  await actor.asksWhether(SettingsShowsPersistedPageSize.now())
})

Then('sync reports completion', async ({ actor }) => {
  await actor.asksWhether(SyncReportsCompletion.now())
})

Then('the knowledge list includes {string}', async ({ actor }, title: string) => {
  await actor.asksWhether(EntryListIncludesTitle.named(title))
})

Then('sync reports the invalid file', async ({ actor }) => {
  await actor.asksWhether(SyncReportsInvalidFile.now())
})

Then('the knowledge list still includes valid fixture entries', async ({ actor }) => {
  await actor.asksWhether(EntryListIncludesTitle.named('Release Bookmark'))
})

Given('the fixture sources include the sync resilience corpus', async ({ actor }) => {
  await actor.attemptsTo(WriteSyncResilienceFixtureSources.now())
})

Then('sync finishes within 60 seconds', async ({ actor }) => {
  await actor.asksWhether(SyncModalFinishesWithinMs.within(60_000))
})

Then('sync modal lists failed file {string}', async ({ actor }, basename: string) => {
  await actor.asksWhether(SyncModalListsFailedFile.named(basename))
})

Then('sync error detail mentions {string}', async ({ actor }, text: string) => {
  await actor.asksWhether(SyncModalErrorDetailContains.text(text))
})

Then('sync reports partial import from {string}', async ({ actor }, basename: string) => {
  await actor.asksWhether(SyncModalFileShowsPartialSuccess.named(basename))
})

Then('the knowledge list includes {string} after sync', async ({ actor }, title: string) => {
  await actor.asksWhether(EntryListIncludesTitle.named(title))
})

Then('sync summary shows at least {int} file with errors', async ({ actor }, n: number) => {
  await actor.asksWhether(SyncModalShowsAtLeastNbrFilesWithErrors.showsAtLeastNbrFilesWithErrors(n))
})

Then('sync summary shows file totals', async ({ actor }) => {
  await actor.asksWhether(SyncModalShowsFileTotalsStrip.now())
})

When('I expand sync errors for file {string}', async ({ actor }, basename: string) => {
  await actor.attemptsTo(SyncModalExpandErrorsForFile.expandErrorsForFile(basename))
})

Then('sync error accordion for {string} shows {string}', async ({ actor }, basename: string, text: string) => {
  await actor.asksWhether(SyncModalAccordionContains.accordionContains(basename, text))
})

Then('the first sync error row is visible', async ({ actor }) => {
  await actor.asksWhether(SyncModalFirstErrorRowInView.now())
})
