import fs from 'node:fs/promises'
import { parseSourceFile, toKnowledge } from '@core'
import type { DbHandle } from '@shell/app/db/client'
import { openDatabase } from '@shell/app/db/client'
import { rebuildFts, upsert } from '@shell/app/db/entry.repository'
import { minimalEntriesYml } from '../paths'

/** Parsed rows from the shared minimal YAML corpus. */
export async function readMinimalFixtureEntries() {
  const content = await fs.readFile(minimalEntriesYml, 'utf-8')
  return parseSourceFile(minimalEntriesYml, content)
}

/** Inserts minimal fixture rows and rebuilds FTS on an existing handle. */
export async function seedMinimalFixture(handle: DbHandle, now = Date.now()): Promise<void> {
  const entries = await readMinimalFixtureEntries()
  await Promise.all(entries.map(entry => upsert(handle.db, toKnowledge(entry, now))))
  rebuildFts(handle.raw)
}

/** In-memory DB preloaded with `fixtures/minimal/entries.yml`. */
export async function createSeededMemoryDb(now = Date.now()): Promise<DbHandle> {
  const handle = openDatabase(':memory:')
  await seedMinimalFixture(handle, now)
  return handle
}
