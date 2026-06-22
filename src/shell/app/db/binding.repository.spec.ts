import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { BindingRef } from '@shared/rpc'
import { deleteBindings, listAllBindings, listBindingsByChord, listBindingsForApp, upsertBindings } from './binding.repository'
import {
  CREATE_BINDING_FRECENCY_INDEXES_SQL,
  CREATE_BINDING_FRECENCY_SQL,
  CREATE_BINDING_INDEXES_SQL,
  CREATE_ENTRY_BINDINGS_SQL
} from './schema'

function createDb(): Database {
  const db = new Database(':memory:')
  db.run(CREATE_ENTRY_BINDINGS_SQL)
  for (const sql of CREATE_BINDING_INDEXES_SQL) db.run(sql)
  db.run(CREATE_BINDING_FRECENCY_SQL)
  for (const sql of CREATE_BINDING_FRECENCY_INDEXES_SQL) db.run(sql)
  return db
}

function ref(overrides: Partial<BindingRef>): BindingRef {
  return {
    bindingId: 'vscode:go-to-file',
    entryKey: 'vscode',
    app: 'vscode',
    platform: 'any',
    scope: 'local',
    chordHash: 'cmd+p',
    chordPrefix: null,
    action: 'Go to File',
    ...overrides
  }
}

describe('binding.repository', () => {
  let db: Database

  beforeEach(() => {
    db = createDb()
  })

  afterEach(() => {
    db.close()
  })

  describe('upsertBindings', () => {
    it('inserts bindings for an entry key', () => {
      upsertBindings(db, 'vscode', [ref({})])
      const all = listAllBindings(db)
      expect(all).toHaveLength(1)
      expect(all[0]?.bindingId).toBe('vscode:go-to-file')
    })

    it('replaces old bindings on re-insert', () => {
      upsertBindings(db, 'vscode', [ref({ bindingId: 'vscode:a', action: 'Old' })])
      upsertBindings(db, 'vscode', [ref({ bindingId: 'vscode:b', action: 'New' })])
      const all = listAllBindings(db)
      expect(all).toHaveLength(1)
      expect(all[0]?.action).toBe('New')
    })

    it('handles multiple entries independently', () => {
      upsertBindings(db, 'vscode', [ref({ bindingId: 'vscode:a' })])
      upsertBindings(db, 'terminal', [ref({ bindingId: 'terminal:a' })])
      expect(listAllBindings(db)).toHaveLength(2)
    })
  })

  describe('deleteBindings', () => {
    it('removes all bindings for the given entry key', () => {
      upsertBindings(db, 'vscode', [ref({})])
      deleteBindings(db, 'vscode')
      expect(listAllBindings(db)).toHaveLength(0)
    })
  })

  describe('listAllBindings', () => {
    it('returns all bindings', () => {
      upsertBindings(db, 'vscode', [ref({ bindingId: 'vscode:a' }), ref({ bindingId: 'vscode:b' })])
      upsertBindings(db, 'terminal', [ref({ bindingId: 'terminal:a' })])
      expect(listAllBindings(db)).toHaveLength(3)
    })

    it('returns empty array when no bindings', () => {
      expect(listAllBindings(db)).toEqual([])
    })
  })

  describe('listBindingsByChord', () => {
    it('finds bindings by chord hash', () => {
      upsertBindings(db, 'vscode', [
        ref({ bindingId: 'vscode:a', chordHash: 'cmd+p' }),
        ref({ bindingId: 'vscode:b', chordHash: 'ctrl+s' })
      ])
      const result = listBindingsByChord(db, 'cmd+p')
      expect(result).toHaveLength(1)
      expect(result[0]?.bindingId).toBe('vscode:a')
    })

    it('finds sequence prefix matches', () => {
      upsertBindings(db, 'vscode', [
        ref({ bindingId: 'vscode:seq', chordHash: 'ctrl+k>ctrl+s', chordPrefix: 'ctrl+k' })
      ])
      const result = listBindingsByChord(db, 'ctrl+k')
      expect(result).toHaveLength(1)
    })

    it('returns empty when no match', () => {
      expect(listBindingsByChord(db, 'cmd+x')).toEqual([])
    })
  })

  describe('listBindingsForApp', () => {
    it('filters by app and platform', () => {
      upsertBindings(db, 'vscode', [
        ref({ bindingId: 'vscode:a', platform: 'macos' }),
        ref({ bindingId: 'vscode:b', platform: 'any' }),
        ref({ bindingId: 'vscode:c', platform: 'linux' })
      ])
      const result = listBindingsForApp(db, 'vscode', 'macos')
      expect(result).toHaveLength(2)
    })
  })
})
