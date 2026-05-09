import { describe, expect, it } from 'bun:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { testingPaths } from '@testing'
import { openDatabase } from './client'
import { findAll } from './entry.repository'
import { ImportService } from './import.service'

const SAMPLE_FILES_PROCESSED = 4
const SAMPLE_INSERTED = 13
const SAMPLE_ERRORS = 1

describe('ImportService', () => {
  it('imports the curated sample directory', async () => {
    const svc = new ImportService(':memory:')
    const result = await svc.run(testingPaths.sample)
    expect(result.filesProcessed).toBe(SAMPLE_FILES_PROCESSED)
    expect(result.inserted).toBe(SAMPLE_INSERTED)
    expect(result.updated).toBe(0)
    expect(result.errors).toHaveLength(SAMPLE_ERRORS)
  })

  it('imports minimal fixture with 4 entries', async () => {
    const svc = new ImportService(':memory:')
    const result = await svc.run(testingPaths.minimal)
    expect(result.filesProcessed).toBe(1)
    expect(result.inserted).toBe(4)
    expect(result.updated).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('second import is idempotent', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kb-test-'))
    const dbPath = path.join(tmpDir, 'test.sqlite')
    try {
      const svc = new ImportService(dbPath)
      const first = await svc.run(testingPaths.minimal)
      const second = await svc.run(testingPaths.minimal)
      expect(second.inserted).toBe(0)
      expect(second.updated).toBe(first.inserted)
      expect(second.errors).toHaveLength(0)

      const { raw } = openDatabase(dbPath)
      const rows = findAll(raw)
      expect(rows).toHaveLength(4)
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('collects one file-level error and continues with sibling sample files', async () => {
    const svc = new ImportService(':memory:')
    const result = await svc.run(testingPaths.sample)

    // mixed_invalid.yml intentionally contains valid and invalid rows together.
    // The parser aborts that bundle on the first invalid row, so the importer
    // records one file-level error while still processing the four valid files.
    expect(result.filesProcessed).toBe(SAMPLE_FILES_PROCESSED)
    expect(result.inserted).toBe(SAMPLE_INSERTED)
    expect(result.errors).toHaveLength(SAMPLE_ERRORS)
    expect(result.errors[0]).toContain('mixed_invalid.yml')
    expect(result.errors[0]).toContain('broken-bookmark')
  })
})
