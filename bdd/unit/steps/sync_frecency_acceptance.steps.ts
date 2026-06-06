import { expect } from 'bun:test'
import { Before, Given, Then, When } from '@cucumber/cucumber'
import {
  BASE_ENTRIES_YML,
  bindingScoreFor,
  COMMAND_PALETTE_BINDING_ID,
  createSyncHarness,
  deriveId,
  disposeActiveSyncHarness,
  entryIds,
  frecencyScore,
  GO_TO_FILE_BINDING_ID,
  getActiveSyncHarness,
  listKeys,
  SHORTCUTS_YML,
  updateSources
} from '../support/sync_frecency_harness.support.ts'

let orderBeforeSync: string[] = []
let newEntryKey = ''
let newEntryId = 0
let bindingScoreBefore = 0
let paletteScoreBefore = 0
let entryScoreBefore = 0
let countBeforeSync = 0
let updatedDescription = ''

Before(() => {
  orderBeforeSync = []
  newEntryKey = ''
  newEntryId = 0
  bindingScoreBefore = 0
  paletteScoreBefore = 0
  entryScoreBefore = 0
  countBeforeSync = 0
  updatedDescription = ''
})

Given('a temp catalog with two bookmarks and one command', async () => {
  await createSyncHarness({ 'entries.yml': BASE_ENTRIES_YML })
})

Given('I have visited the frequent bookmark three times and the rare bookmark once', async () => {
  const { app } = getActiveSyncHarness()
  const { frequentId, rareId } = entryIds(app)
  await app.recordEntryVisit(frequentId)
  await app.recordEntryVisit(frequentId)
  await app.recordEntryVisit(frequentId)
  await app.recordEntryVisit(rareId)
})

When('I run a full source sync', async () => {
  const { app, sourcesDir } = getActiveSyncHarness()
  orderBeforeSync = await listKeys(app)
  await app.sync(sourcesDir)
})

Then('list order for surviving entries matches pre-sync order', async () => {
  const { app } = getActiveSyncHarness()
  const orderAfter = await listKeys(app)
  const survivingBefore = orderBeforeSync.filter(key => orderAfter.includes(key))
  expect(orderAfter).toEqual(survivingBefore)
})

Then('the frequent bookmark ranks above the rare bookmark', async () => {
  const { app } = getActiveSyncHarness()
  const { frequentId, rareId } = entryIds(app)
  expect(frecencyScore(app, frequentId)).toBeGreaterThan(frecencyScore(app, rareId))
})

Then('the command has zero frecency score', async () => {
  const { app } = getActiveSyncHarness()
  const { gitId } = entryIds(app)
  expect(frecencyScore(app, gitId)).toBe(0)
  await disposeActiveSyncHarness()
})

// ===== SF-1 AC2 =====

Given('the rare bookmark is removed from the source YAML', async () => {
  await updateSources({
    'entries.yml': BASE_ENTRIES_YML.replace('  https://rare.example:\n    desc: Rare entry\n    tags: [test]\n', '')
  })
})

Then('the rare bookmark is absent from the list', async () => {
  const { app } = getActiveSyncHarness()
  const keys = await listKeys(app)
  expect(keys).not.toContain('https://rare.example')
})

// ===== SF-1 AC3 =====

Given('I have visited the frequent bookmark three times', async () => {
  const { app } = getActiveSyncHarness()
  const { frequentId } = entryIds(app)
  await app.recordEntryVisit(frequentId)
  await app.recordEntryVisit(frequentId)
  await app.recordEntryVisit(frequentId)
})

Given('a new bookmark is added to the source YAML', async () => {
  newEntryKey = 'https://new.example'
  newEntryId = deriveId('bookmark', newEntryKey)
  await updateSources({
    'entries.yml': BASE_ENTRIES_YML.replace(
      '  https://rare.example:\n    desc: Rare entry\n    tags: [test]\n',
      `  https://rare.example:\n    desc: Rare entry\n    tags: [test]\n  ${newEntryKey}:\n    desc: Brand new entry\n    tags: [test]\n`
    )
  })
})

Then('the new bookmark appears below the frequent bookmark in the list', async () => {
  const { app } = getActiveSyncHarness()
  const orderAfter = await listKeys(app)
  const newIndex = orderAfter.indexOf(newEntryKey)
  const frequentIndex = orderAfter.indexOf('https://frequent.example')
  expect(newIndex).toBeGreaterThan(frequentIndex)
})

Then('the new bookmark has zero frecency score', async () => {
  const { app } = getActiveSyncHarness()
  expect(frecencyScore(app, newEntryId)).toBe(0)
})

When('I open the new bookmark once', async () => {
  const { app } = getActiveSyncHarness()
  await app.recordEntryVisit(newEntryId)
})

Then('the new bookmark has a positive frecency score', async () => {
  const { app } = getActiveSyncHarness()
  expect(frecencyScore(app, newEntryId)).toBeGreaterThan(0)
  await disposeActiveSyncHarness()
})

// ===== SF-2 AC1 / AC2 shared =====

Given('a temp catalog with entries and shortcuts', async () => {
  await createSyncHarness({
    'entries.yml': BASE_ENTRIES_YML,
    'shortcuts.yml': SHORTCUTS_YML
  })
})

Given('I have used the Go to File binding twice and the Command Palette binding once', async () => {
  const { app } = getActiveSyncHarness()
  await app.recordBindingVisit(GO_TO_FILE_BINDING_ID, 1.0)
  await app.recordBindingVisit(GO_TO_FILE_BINDING_ID, 1.0)
  await app.recordBindingVisit(COMMAND_PALETTE_BINDING_ID, 1.0)
  bindingScoreBefore = bindingScoreFor(app, GO_TO_FILE_BINDING_ID)
  paletteScoreBefore = bindingScoreFor(app, COMMAND_PALETTE_BINDING_ID)
})

// ===== SF-2 AC1 =====

Then('the Go to File binding score is unchanged after sync', async () => {
  const { app } = getActiveSyncHarness()
  expect(bindingScoreFor(app, GO_TO_FILE_BINDING_ID)).toBe(bindingScoreBefore)
})

Then('the Go to File binding score exceeds the Command Palette binding score', async () => {
  const { app } = getActiveSyncHarness()
  const goToFile = bindingScoreFor(app, GO_TO_FILE_BINDING_ID)
  const palette = bindingScoreFor(app, COMMAND_PALETTE_BINDING_ID)
  expect(goToFile).toBeGreaterThan(palette)
  await disposeActiveSyncHarness()
})

// ===== SF-2 AC2 =====

Given('the Go to File binding is removed from the source YAML', async () => {
  await updateSources({
    'entries.yml': BASE_ENTRIES_YML,
    'shortcuts.yml': SHORTCUTS_YML.replace(
      '      - chord: cmd+p\n        action: Go to File\n        scope: local\n',
      ''
    )
  })
})

Then('the Go to File binding is absent from the binding list', async () => {
  const { app } = getActiveSyncHarness()
  const bindings = await app.listBindings()
  expect(bindings.some(b => b.bindingId === GO_TO_FILE_BINDING_ID)).toBe(false)
})

Then('the Command Palette binding is still present', async () => {
  const { app } = getActiveSyncHarness()
  const bindings = await app.listBindings()
  expect(bindings.some(b => b.bindingId === COMMAND_PALETTE_BINDING_ID)).toBe(true)
})

Then('the Go to File binding has zero score in the database', async () => {
  const { app } = getActiveSyncHarness()
  expect(bindingScoreFor(app, GO_TO_FILE_BINDING_ID)).toBe(0)
})

Then('the Command Palette binding score is unchanged after sync', async () => {
  const { app } = getActiveSyncHarness()
  expect(bindingScoreFor(app, COMMAND_PALETTE_BINDING_ID)).toBe(paletteScoreBefore)
  await disposeActiveSyncHarness()
})

// ===== SF-3 AC2 =====

Given('the frequent bookmark has been visited twice', async () => {
  const { app } = getActiveSyncHarness()
  const { frequentId } = entryIds(app)
  await app.recordEntryVisit(frequentId)
  await app.recordEntryVisit(frequentId)
  entryScoreBefore = frecencyScore(app, frequentId)
})

When('I change the frequent bookmark title in the source YAML', async () => {
  updatedDescription = 'Updated frequent title'
  await updateSources({
    'entries.yml': BASE_ENTRIES_YML.replace('Frequent entry', updatedDescription)
  })
})

Then('the frequent bookmark has the updated title', async () => {
  const { app } = getActiveSyncHarness()
  const { frequentId } = entryIds(app)
  const entry = await app.getEntry(frequentId)
  expect(entry?.desc).toBe(updatedDescription)
})

Then('the frequent bookmark frecency score is unchanged from before sync', async () => {
  const { app } = getActiveSyncHarness()
  const { frequentId } = entryIds(app)
  expect(frecencyScore(app, frequentId)).toBe(entryScoreBefore)
  await disposeActiveSyncHarness()
})

// ===== SF-3 AC4 =====

Given('a temp catalog with entries and an extra bundle', async () => {
  await createSyncHarness({
    '01_entries.yml': BASE_ENTRIES_YML,
    '02_extra.yml': `cheats:
  Git basics:
    desc: Extra cheat sheet
    tags: [git]
`
  })
})

When('I run a partial source sync that processes only one bundle', async () => {
  const { app, sourcesDir } = getActiveSyncHarness()
  countBeforeSync = (await app.list({ limit: 50 })).length
  await app.sync(sourcesDir, { maxBundlesToProcess: 1 })
})

Then('the number of catalog entries is reduced', async () => {
  const { app } = getActiveSyncHarness()
  const countAfter = (await app.list({ limit: 50 })).length
  expect(countAfter).toBeLessThan(countBeforeSync)
})

Then('the frequent bookmark frecency score matches the pre-sync value', async () => {
  const { app } = getActiveSyncHarness()
  const { frequentId } = entryIds(app)
  expect(frecencyScore(app, frequentId)).toBe(entryScoreBefore)
  await disposeActiveSyncHarness()
})
