import { describe, expect, it } from 'bun:test'
import { openDatabase } from '@shell/app/db/client'
import { rebuildFts, upsert } from '@shell/app/db/entry.repository'
import { factoryFor } from '@testing'

import { buildListStatsForFilters } from './app_list_stats_for_filters.util'

describe('buildListStatsForFilters', () => {
  it('scopes tag counts to selected types', () => {
    const { raw } = openDatabase(':memory:')
    const loaded = factoryFor('loadedConfig')
    upsert(raw, factoryFor('bookmark', { overrides: { tags: ['fabric'], key: 'https://bm.example/1' } }))
    upsert(raw, factoryFor('cheat', { overrides: { tags: ['fabric'], key: 'https://ch.example/1' } }))
    upsert(raw, factoryFor('cheat', { overrides: { tags: ['solo'], key: 'https://ch.example/2' } }))
    rebuildFts(raw)

    const scoped = buildListStatsForFilters(raw, loaded, { types: ['cheat'] })
    expect(scoped.tags.fabric).toBe(1)
    expect(scoped.tags.solo).toBe(1)
    expect(scoped.cheat).toBe(2)
    expect(scoped.bookmark).toBe(3)
  })
})
