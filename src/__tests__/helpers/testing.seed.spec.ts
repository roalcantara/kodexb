import { describe, expect, it } from 'bun:test'
import { findAll } from '@shell/app/db/entry.repository'
import { createSeededMemoryDb } from './testing.seed'

describe('createSeededMemoryDb()', () => {
  it('loads four rows', async () => {
    const { raw } = await createSeededMemoryDb()
    expect(findAll(raw)).toHaveLength(4)
  })
})
