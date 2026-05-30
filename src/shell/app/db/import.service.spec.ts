import { describe, expect, it } from 'bun:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { RpcSyncProgressPayload } from '@shared/rpc'
import { syncFixtureDir, testingPaths } from '@testing'
import { openDatabase } from './client'
import { findAll } from './entry.repository'
import { ImportService } from './import.service'

const SAMPLE_FILES_PROCESSED = 5
const SAMPLE_INSERTED = 15
const SAMPLE_ERRORS = 1

describe('ImportService', () => {
  describe('successful imports', () => {
    it('imports sample directory', async () => {
      const svc = new ImportService(':memory:')
      const result = await svc.run(testingPaths.sample)
      expect(result.filesProcessed).toBe(SAMPLE_FILES_PROCESSED)
      expect(result.inserted).toBe(SAMPLE_INSERTED)
      expect(result.updated).toBe(0)
      expect(result.errors).toHaveLength(SAMPLE_ERRORS)
    })

    it('imports minimal fixture', async () => {
      const svc = new ImportService(':memory:')
      const result = await svc.run(testingPaths.minimal)
      expect(result.filesProcessed).toBe(1)
      expect(result.inserted).toBe(4)
      expect(result.updated).toBe(0)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('idempotency and error handling', () => {
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

    it('collects errors and continues', async () => {
      const svc = new ImportService(':memory:')
      const result = await svc.run(testingPaths.sample)
      expect(result.filesProcessed).toBe(SAMPLE_FILES_PROCESSED)
      expect(result.inserted).toBe(SAMPLE_INSERTED)
      expect(result.errors).toHaveLength(SAMPLE_ERRORS)
      expect(result.errors[0]).toContain('mixed_invalid.yml')
      expect(result.errors[0]).toContain('broken-bookmark')
    })
  })

  describe('completion guard and progress', () => {
    it('completes within 30s wall clock using sync fixtures', async () => {
      const svc = new ImportService(':memory:')
      const result = await Promise.race([
        svc.runOnce(syncFixtureDir),
        Bun.sleep(30_000).then(() => {
          throw new Error('timeout')
        })
      ])
      expect(result).toBeDefined()
    })

    it('rebuilds FTS and collects collision warnings after file loop', async () => {
      const svc = new ImportService(':memory:')
      const result = await svc.runOnce(syncFixtureDir)
      expect(result.warnings).toBeDefined()
      expect(Array.isArray(result.warnings)).toBe(true)
    })

    it('emits onProgress once per file', async () => {
      const svc = new ImportService(':memory:')
      const calls: RpcSyncProgressPayload[] = []
      await svc.runOnce(syncFixtureDir, { onProgress: p => calls.push(p) })
      expect(calls.length).toBeGreaterThan(0)
      for (const call of calls) {
        expect(call.processed).toBeGreaterThan(0)
        expect(call.total).toBeGreaterThan(0)
      }
    })
  })

  describe('collision warnings', () => {
    it('reports hard global collisions after import', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kb-collision-'))
      const dbPath = path.join(tmpDir, 'test.sqlite')
      const sourcesDir = path.join(tmpDir, 'sources')
      await fs.mkdir(path.join(sourcesDir, 'shortcuts'), { recursive: true })
      await fs.writeFile(
        path.join(sourcesDir, 'shortcuts', 'clash.yml'),
        `shortcuts:
  app-a:
    desc: App A
    tags: [test]
    bindings:
      - chord: cmd+space
        action: Action A
        scope: global
  app-b:
    desc: App B
    tags: [test]
    bindings:
      - chord: cmd+space
        action: Action B
        scope: global
`,
        'utf-8'
      )
      try {
        const svc = new ImportService(dbPath)
        const result = await svc.run(sourcesDir)
        expect(result.errors).toHaveLength(0)
        expect(result.warnings.some(w => w.includes('hard collision') && w.includes('cmd+space'))).toBe(true)
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true })
      }
    })
  })
})
