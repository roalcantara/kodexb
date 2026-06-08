// @sync
import { describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import { factoryFor, syncFixtureDir } from '@testing'
import { App } from './app'
import { SyncDatabaseBusyError } from './lib/sync_database_busy.error'

function isSyncInFlight(app: App): boolean {
  return (app as unknown as { syncInFlight: boolean }).syncInFlight === true
}

function makeCleanApp(databasePath: string): App {
  const loaded = factoryFor('loadedConfig', {
    overrides: {
      sources: { path: syncFixtureDir },
      database: { path: databasePath }
    }
  })
  for (const p of [loaded.database.path, `${loaded.database.path}-wal`, `${loaded.database.path}-shm`]) {
    try {
      fs.unlinkSync(p)
    } catch {
      /* missing */
    }
  }
  return new App(loaded)
}

async function waitForSyncInFlight(app: App, timeoutMs: number): Promise<void> {
  const startedAt = Date.now()
  const poll = async (): Promise<void> => {
    if (isSyncInFlight(app)) return
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error('syncInFlight never became true before timeout')
    }
    await Bun.sleep(1)
    return poll()
  }
  await poll()
}

describe('App.sync concurrency', () => {
  it('rejects list and stats while sync owns the database file', async () => {
    const app = makeCleanApp('/tmp/kb-sync-busy-test.sqlite')
    const syncPromise = app.sync(syncFixtureDir)
    await waitForSyncInFlight(app, 2000)
    expect(() => app.list({ limit: 1 })).toThrow(SyncDatabaseBusyError)
    expect(() => app.getListStats()).toThrow(SyncDatabaseBusyError)
    const result = await syncPromise
    expect(result.filesProcessed).toBeGreaterThan(0)
    const rows = await app.list({ limit: 5 })
    expect(rows.length).toBeGreaterThan(0)
  })

  it('keeps task projection stable after failed mutation then sync', async () => {
    const app = makeCleanApp('/tmp/kb-sync-failed-mutation.sqlite')
    await app.sync(syncFixtureDir)
    const before = await app.listMatchCount({ types: ['task'] })

    ;(app as unknown as { loaded: { writeTarget: string } }).loaded.writeTarget = '/dev/null/tasks.yml'
    await expect(app.createTask({ key: 'sync-failure-probe', desc: 'should fail source write' })).rejects.toThrow()

    const afterFailure = await app.listMatchCount({ types: ['task'] })
    expect(afterFailure).toBe(before)

    await app.sync(syncFixtureDir)
    const afterSync = await app.listMatchCount({ types: ['task'] })
    expect(afterSync).toBe(before)
  })
})
