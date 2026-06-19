import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { readEnvelopeFile, seedDispatchedKeys } from './orchestrator_resume.script'

describe('orchestrator_resume', () => {
  let scratchDir: string

  afterEach(() => {
    if (scratchDir) rmSync(scratchDir, { recursive: true, force: true })
  })

  it('readEnvelopeFile returns null for missing file', () => {
    expect(readEnvelopeFile('/nonexistent/path.json')).toBeNull()
  })

  it('seedDispatchedKeys resolves composite key from stageCommands', () => {
    scratchDir = mkdtempSync(path.join(tmpdir(), 'ors-'))
    const runId = 'r1'
    const envelope = {
      schema_version: '009.1.0',
      stage: 'specify',
      status: 'DONE',
      artifacts_created: [],
      evidence: [],
      diagnostics: [],
      retry_count: 0,
      elapsed_ms: 10
    }
    writeFileSync(path.join(scratchDir, `${runId}.envelope.specify.json`), JSON.stringify(envelope))

    const keys: string[] = []
    seedDispatchedKeys(scratchDir, runId, { specify: 'echo worker' }, key => keys.push(key))

    expect(keys.length).toBe(1)
    expect(keys[0]).toBe('r1:specify:echo worker')
  })

  it('seedDispatchedKeys uses idempotency_key when present', () => {
    scratchDir = mkdtempSync(path.join(tmpdir(), 'ors-'))
    const runId = 'r2'
    const envelope = {
      schema_version: '009.1.0',
      stage: 'plan',
      status: 'DONE',
      artifacts_created: [],
      evidence: [],
      diagnostics: [],
      retry_count: 0,
      elapsed_ms: 10,
      idempotency_key: 'ik-abc123'
    }
    writeFileSync(path.join(scratchDir, `${runId}.envelope.plan.json`), JSON.stringify(envelope))

    const keys: string[] = []
    seedDispatchedKeys(scratchDir, runId, { plan: 'echo hello' }, key => keys.push(key))

    expect(keys[0]).toBe('ik-abc123')
  })
})
