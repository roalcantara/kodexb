import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  applyRetention,
  ensureStageMemory,
  readSharedMemory,
  resolveMemoryConflict,
  sharedMemoryPath,
  stageMemoryPath,
  writeSharedMemory,
  writeStageMemory
} from './memory.script'

const RUN_ID = 'test-run-001'
const DATE_STR = '2026-06-10'

describe('memory paths', () => {
  it('stageMemoryPath constructs correct path', () => {
    const p = stageMemoryPath('/root', DATE_STR, RUN_ID, 'specify')
    expect(p).toContain('/root')
    expect(p).toContain(DATE_STR)
    expect(p).toContain(RUN_ID)
    expect(p).toContain('specify')
    expect(p.endsWith('.json')).toBe(true)
  })

  it('sharedMemoryPath constructs correct path', () => {
    const p = sharedMemoryPath('/root', DATE_STR, RUN_ID)
    expect(p).toContain('/root')
    expect(p).toContain(DATE_STR)
    expect(p).toContain(RUN_ID)
    expect(p.endsWith('.shared.json')).toBe(true)
  })
})

describe('memory I/O', () => {
  let scratch: string

  beforeEach(() => {
    scratch = mkdtempSync(path.join(tmpdir(), 'mem-test-'))
  })

  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true })
  })

  describe('stage memory I/O', () => {
    it('AWO-7 AC1: creates empty stage memory on first access', () => {
      const data = ensureStageMemory(scratch, DATE_STR, RUN_ID, 'specify')
      expect(data).toEqual({})
      const p = stageMemoryPath(scratch, DATE_STR, RUN_ID, 'specify')
      expect(existsSync(p)).toBe(true)
    })

    it('AWO-7 AC1: reuses existing stage memory on subsequent access', () => {
      writeStageMemory(scratch, DATE_STR, RUN_ID, 'specify', { key: 'val' })
      const data = ensureStageMemory(scratch, DATE_STR, RUN_ID, 'specify')
      expect(data).toEqual({ key: 'val' })
    })

    it('read/write stage memory round-trips', () => {
      writeStageMemory(scratch, DATE_STR, RUN_ID, 'specify', { choice: 'react', confirmed: true })
      const data = ensureStageMemory(scratch, DATE_STR, RUN_ID, 'specify')
      expect(data).toEqual({ choice: 'react', confirmed: true })
    })
  })

  describe('shared memory I/O', () => {
    it('AWO-7 AC2: read/write shared memory', () => {
      writeSharedMemory(scratch, DATE_STR, RUN_ID, { framework: 'vue', tests: true })
      const data = readSharedMemory(scratch, DATE_STR, RUN_ID)
      expect(data.framework).toBe('vue')
      expect(data.tests).toBe(true)
    })

    it('returns empty object for missing shared memory', () => {
      const data = readSharedMemory(scratch, DATE_STR, 'nonexistent')
      expect(data).toEqual({})
    })
  })
})

describe('AWO-7 AC3: resolveMemoryConflict', () => {
  const existing = { key1: 'old', key2: 'shared' }

  it('prefer_latest merges incoming over existing', () => {
    const r = resolveMemoryConflict(existing, { key1: 'new' }, 'prefer_latest')
    expect(r.ok).toBe(true)
    expect(r.data.key1).toBe('new')
    expect(r.data.key2).toBe('shared')
  })

  it('prompt_user blocks on conflict', () => {
    const r = resolveMemoryConflict(existing, { key1: 'new' }, 'prompt_user')
    expect(r.ok).toBe(false)
    expect(r.conflict).toContain('key1')
  })

  it('prompt_user allows non-conflicting merge', () => {
    const r = resolveMemoryConflict(existing, { key3: 'fresh' }, 'prompt_user')
    expect(r.ok).toBe(true)
    expect(r.data.key3).toBe('fresh')
  })

  it('block rejects on conflict', () => {
    const r = resolveMemoryConflict(existing, { key1: 'new' }, 'block')
    expect(r.ok).toBe(false)
    expect(r.conflict).toContain('key1')
  })

  it('block allows no-conflict merge', () => {
    const r = resolveMemoryConflict(existing, { key3: 'fresh' }, 'block')
    expect(r.ok).toBe(true)
    expect(r.data.key3).toBe('fresh')
  })
})

describe('AWO-7 AC4: applyRetention', () => {
  let scratch: string
  const todayStr = new Date().toISOString().slice(0, 10)

  beforeEach(() => {
    scratch = mkdtempSync(path.join(tmpdir(), 'ret-test-'))
    const oldDate = '2020-01-01'
    writeSharedMemory(scratch, oldDate, 'old-run', { data: 'old' })
    writeSharedMemory(scratch, todayStr, 'current-run', { data: 'current' })
  })

  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true })
  })

  it('prunes old entries beyond tmp_days', () => {
    const r = applyRetention(scratch, 1)
    expect(r.pruned).toBeGreaterThanOrEqual(1)
    expect(existsSync(path.join(scratch, '2020-01-01'))).toBe(false)
  })

  it('keeps recent entries within retention window', () => {
    applyRetention(scratch, 1)
    expect(existsSync(path.join(scratch, todayStr))).toBe(true)
  })
})
