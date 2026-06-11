import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { readEnvelope, writeEnvelope } from './kit_envelope.script.ts'

describe('kit_envelope', () => {
  let origCwd: string
  let scratchDir: string

  beforeAll(() => {
    origCwd = process.cwd()
    scratchDir = mkdtempSync(path.join(tmpdir(), 'ke-'))
    process.chdir(scratchDir)
  })

  afterAll(() => {
    process.chdir(origCwd)
    rmSync(scratchDir, { recursive: true, force: true })
  })

  it('writes and reads a DONE envelope', () => {
    writeEnvelope({
      runId: 'test-run-1',
      stage: 'specify',
      status: 'DONE',
      artifactsCreated: ['spec.md'],
      evidence: [{ kind: 'command', ref: 'mise run spec lint' }],
      diagnostics: [],
      retryCount: 0,
      elapsedMs: 42
    })

    const env = readEnvelope('test-run-1', 'specify')
    expect(env).not.toBeNull()
    if (env) {
      expect(env.status).toBe('DONE')
      expect(env.stage).toBe('specify')
      expect(env.schema_version).toBe('009.1.0')
      expect(env.artifacts_created).toContain('spec.md')
      expect(env.elapsed_ms).toBe(42)
    }
  })

  it('writes a BLOCKED envelope', () => {
    writeEnvelope({
      runId: 'test-run-2',
      stage: 'review',
      status: 'BLOCKED',
      artifactsCreated: [],
      evidence: [],
      diagnostics: [{ code: 'HUMAN_GATE', message: 'Awaiting approval', severity: 'warn' }],
      retryCount: 0,
      elapsedMs: 0
    })

    const env = readEnvelope('test-run-2', 'review')
    expect(env).not.toBeNull()
    if (env) {
      expect(env.status).toBe('BLOCKED')
      expect(env.diagnostics[0].code).toBe('HUMAN_GATE')
    }
  })

  it('returns null for non-existent envelope', () => {
    expect(readEnvelope('nonexistent', 'specify')).toBeNull()
  })

  it('returns null for corrupt envelope JSON', () => {
    const today = new Date().toISOString().slice(0, 10)
    const dir = path.join('tmp/workflow-runs', today, 'bad-run')
    mkdirSync(dir, { recursive: true })
    writeFileSync(path.join(dir, 'bad-run.envelope.specify.json'), '{"stage":"specify"}')
    expect(readEnvelope('bad-run', 'specify')).toBeNull()
  })
})
