import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { captureEnvelope } from './envelope_capture.script.ts'

let tmpDir: string | null = null

function envPath(name: string): string {
  tmpDir = mkdtempSync(path.join(tmpdir(), 'envelope-'))
  return path.join(tmpDir, name)
}

afterEach(() => {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
  tmpDir = null
})

describe('captureEnvelope', () => {
  it('returns present_valid for a valid envelope', () => {
    const fp = envPath('test.envelope.json')
    writeFileSync(
      fp,
      JSON.stringify({
        schema_version: '009.1.0',
        stage: 'specify',
        status: 'DONE',
        artifacts_created: [],
        evidence: [],
        diagnostics: [],
        retry_count: 0,
        elapsed_ms: 100
      })
    )
    const result = captureEnvelope(fp)
    expect(result.outcome).toBe('present_valid')
    expect(result.envelope).not.toBeNull()
  })

  it('returns absent for missing envelope file', () => {
    const result = captureEnvelope('/nonexistent/envelope.json')
    expect(result.outcome).toBe('absent')
    expect(result.envelope).toBeNull()
  })

  it('returns malformed for invalid JSON', () => {
    const fp = envPath('bad.json')
    writeFileSync(fp, 'not json')
    const result = captureEnvelope(fp)
    expect(result.outcome).toBe('malformed')
    expect(result.diagnostics.length).toBeGreaterThan(0)
  })

  it('returns malformed for schema violation', () => {
    const fp = envPath('invalid.json')
    writeFileSync(fp, JSON.stringify({ schema_version: '009.1.0' }))
    const result = captureEnvelope(fp)
    expect(result.outcome).toBe('malformed')
  })
})
