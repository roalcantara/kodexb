import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { readStateSnapshot, writeStateSnapshot } from './persistence.script'

let tmpRoot: string | null = null
const DATE_STR = new Date().toISOString().slice(0, 10)

function config() {
  tmpRoot = mkdtempSync(path.join(tmpdir(), 'persistence-'))
  return { rootDir: tmpRoot, metricsDir: path.join(tmpRoot, 'metrics') }
}

afterEach(() => {
  if (tmpRoot && existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true })
  tmpRoot = null
})

describe('writeStateSnapshot', () => {
  it('writes state snapshot atomically', () => {
    const cfg = config()
    const state = { run_id: 'test-run', status: 'active' }
    const statePath = writeStateSnapshot(cfg, 'test-run', DATE_STR, state)
    expect(existsSync(statePath)).toBe(true)
    const content = readFileSync(statePath, 'utf-8')
    expect(JSON.parse(content)).toEqual(state)
  })
})

describe('readStateSnapshot', () => {
  it('reads back a written snapshot', () => {
    const cfg = config()
    const state = { run_id: 'test-run', status: 'active' }
    writeStateSnapshot(cfg, 'test-run', DATE_STR, state)
    const loaded = readStateSnapshot(cfg, 'test-run', DATE_STR)
    expect(loaded).toEqual(state)
  })

  it('returns null for missing snapshot', () => {
    const cfg = config()
    const result = readStateSnapshot(cfg, 'no-such-run', DATE_STR)
    expect(result).toBeNull()
  })
})
