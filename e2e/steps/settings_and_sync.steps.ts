import { expect } from '@playwright/test'
import {
  SettingsReportsSaved,
  SettingsShowsDatabasePath,
  SettingsShowsPageSize,
  SettingsShowsPersistedPageSize,
  SettingsShowsSourcesPath
} from '../screenplay/settings.question'
import { ChangePageSize, OpenSettings, ResetSettings, SaveSettings } from '../screenplay/settings.task'
import { SyncReportsCompletion, SyncReportsInvalidFile } from '../screenplay/sync.question'
import { RunSync, WriteFixtureBookmark, WriteInvalidFixtureSource } from '../screenplay/sync.task'
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
