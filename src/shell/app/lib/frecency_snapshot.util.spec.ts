// @sync_frecency_preserve
import { describe, expect, it } from 'bun:test'
import { factoryFor } from '@testing'
import { upsertBindings } from '../db/binding.repository'
import { recordBindingVisit } from '../db/binding_frecency.repository'
import { openDatabase } from '../db/client'
import { upsert } from '../db/entry.repository'
import { recordEntryVisit } from '../db/frecency.repository'
import { exportLearnedSnapshot, restoreLearnedSnapshot } from './frecency_snapshot.util'

describe('exportLearnedSnapshot()', () => {
  it('exports entry and binding rows', () => {
    const { raw } = openDatabase(':memory:')
    const row = factoryFor('bookmark')
    upsert(raw, row)
    recordEntryVisit(raw, row.id, 1_700_000_000_000)
    upsertBindings(raw, 'vscode', [
      {
        bindingId: 'vscode:go-to-file',
        entryKey: 'vscode',
        app: 'vscode',
        platform: 'any',
        scope: 'local',
        chordHash: 'cmd+p',
        chordPrefix: null,
        action: 'Go to File'
      }
    ])
    recordBindingVisit(raw, 'vscode:go-to-file', 1.0, '2026-01-01T00:00:00.000Z')

    const snapshot = exportLearnedSnapshot(raw)
    expect(snapshot.entries).toHaveLength(1)
    expect(snapshot.entries[0]?.entry_id).toBe(row.id)
    expect(snapshot.bindings).toHaveLength(1)
    expect(snapshot.bindings[0]?.binding_id).toBe('vscode:go-to-file')
  })
})

describe('restoreLearnedSnapshot()', () => {
  it('skips rows whose catalog id was removed', () => {
    const { raw } = openDatabase(':memory:')
    const kept = factoryFor('bookmark', { overrides: { id: 1, key: 'https://kept.example' } })
    const removed = factoryFor('bookmark', { overrides: { id: 2, key: 'https://removed.example' } })
    upsert(raw, kept)
    upsert(raw, removed)
    recordEntryVisit(raw, kept.id, 1_700_000_000_000)
    recordEntryVisit(raw, removed.id, 1_700_000_000_001)

    const snapshot = exportLearnedSnapshot(raw)
    raw.query('DELETE FROM knowledges WHERE id = ?').run(removed.id)

    const result = restoreLearnedSnapshot(raw, snapshot)
    expect(result.entryRestored).toBe(1)
    expect(result.entrySkipped).toBe(1)

    const keptScore = raw
      .query<{ frecency_score: number }, [number]>('SELECT frecency_score FROM entry_frecency WHERE entry_id = ?')
      .get(kept.id)
    expect(keptScore?.frecency_score).toBe(1)
    const removedRow = raw
      .query<{ n: number }, [number]>('SELECT COUNT(*) AS n FROM entry_frecency WHERE entry_id = ?')
      .get(removed.id)
    expect(removedRow?.n).toBe(0)
  })

  it('is idempotent on repeated restore', () => {
    const { raw } = openDatabase(':memory:')
    const row = factoryFor('bookmark')
    upsert(raw, row)
    recordEntryVisit(raw, row.id, 1_700_000_000_000)
    recordEntryVisit(raw, row.id, 1_700_000_000_001)

    const snapshot = exportLearnedSnapshot(raw)
    raw.query('DELETE FROM entry_frecency').run()

    restoreLearnedSnapshot(raw, snapshot)
    const first = raw
      .query<{ visit_count: number }, [number]>('SELECT visit_count FROM entry_frecency WHERE entry_id = ?')
      .get(row.id)
    restoreLearnedSnapshot(raw, snapshot)
    const second = raw
      .query<{ visit_count: number }, [number]>('SELECT visit_count FROM entry_frecency WHERE entry_id = ?')
      .get(row.id)

    expect(first?.visit_count).toBe(2)
    expect(second?.visit_count).toBe(2)
  })
})
