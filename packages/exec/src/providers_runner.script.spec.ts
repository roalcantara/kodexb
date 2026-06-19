import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { readSharedMemory } from './memory.script'
import { capturePrRef, persistPrRef, runProvider } from './providers_runner.script'
import { WorkflowRunWriter } from './workflow_run.script'

const RUN_ID = 'test-provider-001'
const DATE_STR = '2026-06-10'

describe('capturePrRef', () => {
  it('extracts PR URL from gh output', () => {
    const out = 'https://github.com/owner/repo/pull/42\n'
    expect(capturePrRef(out)).toBe('https://github.com/owner/repo/pull/42')
  })

  it('falls back to empty string when no URL found', () => {
    expect(capturePrRef('  some output  ')).toBe('')
  })
})

describe('persistPrRef', () => {
  let scratch: string

  beforeEach(() => {
    scratch = mkdtempSync(path.join(tmpdir(), 'pr-test-'))
  })

  afterEach(() => {
    try {
      rmSync(scratch, { recursive: true, force: true })
    } catch {
      /* best-effort */
    }
  })

  it('AWO-6 AC2: persists PR ref in shared memory', () => {
    persistPrRef(scratch, DATE_STR, RUN_ID, 'https://github.com/o/r/pull/99')
    const shared = readSharedMemory(scratch, DATE_STR, RUN_ID)
    expect(shared.pr_ref).toBe('https://github.com/o/r/pull/99')
    expect(shared.pr_created_at).toBeTruthy()
  })
})

describe('runProvider', () => {
  let scratch: string

  beforeEach(() => {
    scratch = mkdtempSync(path.join(tmpdir(), 'run-prov-'))
  })

  afterEach(() => {
    try {
      rmSync(scratch, { recursive: true, force: true })
    } catch {
      /* best-effort */
    }
  })

  it('runs a successful echo command', () => {
    const writer = new WorkflowRunWriter('test-run', 'test-feat', scratch)
    const result = runProvider('echo hello', ['echo'], writer, 'provider', 'test', 'test-feat')
    expect(result.ok).toBe(true)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('hello')
  })

  it('reports failure on non-zero exit', () => {
    const writer = new WorkflowRunWriter('test-run', 'test-feat', scratch)
    const result = runProvider('bun -e "process.exit(1)"', ['bun'], writer, 'provider', 'test', 'test-feat')
    expect(result.ok).toBe(false)
    expect(result.exitCode).toBe(1)
  })
})
