import { describe, expect, it } from 'bun:test'
import type { EvidenceResult } from './evidence.script'
import { evaluateEvidence } from './evidence.script'
import { makeEnvelope } from './schemas/envelope.fixture'

describe('evaluateEvidence', () => {
  it('passes marker kind when file exists', () => {
    const env = makeEnvelope({ evidence: [{ kind: 'marker', ref: 'checklists/ux.md' }] })
    const results = evaluateEvidence(env, { fileExists: p => p === 'checklists/ux.md' })
    expect(results).toHaveLength(1)
    const r0 = results[0] as EvidenceResult
    expect(r0.passed).toBe(true)
  })

  it('fails marker kind when file is missing', () => {
    const env = makeEnvelope({ evidence: [{ kind: 'marker', ref: 'checklists/missing.md' }] })
    const results = evaluateEvidence(env, { fileExists: () => false })
    const r0 = results[0] as EvidenceResult
    expect(r0.passed).toBe(false)
    expect(r0.diagnostic).toContain('not found')
  })

  it('passes artifact kind when file exists without expected hash', () => {
    const env = makeEnvelope({ evidence: [{ kind: 'artifact', ref: 'docs/spec.md' }] })
    const results = evaluateEvidence(env, { fileExists: () => true })
    const r0 = results[0] as EvidenceResult
    expect(r0.passed).toBe(true)
  })

  it('fails artifact when file is missing', () => {
    const env = makeEnvelope({ evidence: [{ kind: 'artifact', ref: 'docs/missing.md' }] })
    const results = evaluateEvidence(env, { fileExists: () => false })
    const r0 = results[0] as EvidenceResult
    expect(r0.passed).toBe(false)
  })

  it.each([
    { hash: 'abc123', label: 'match', expected: true },
    { hash: 'def456', label: 'mismatch', expected: false }
  ])('checks artifact content hash: $label', ({ hash, expected }) => {
    const env = makeEnvelope({ evidence: [{ kind: 'artifact', ref: 'docs/spec.md', expected: 'abc123' }] })
    const results = evaluateEvidence(env, {
      fileExists: () => true,
      readFile: () => 'content',
      contentHash: () => hash
    })
    const r0 = results[0] as EvidenceResult
    expect(r0.passed).toBe(expected)
  })

  it('returns command kind as deferred to adapter', () => {
    const env = makeEnvelope({ evidence: [{ kind: 'command', ref: 'bun run check.sh' }] })
    const results = evaluateEvidence(env, { fileExists: () => false })
    const r0 = results[0] as EvidenceResult
    expect(r0.passed).toBe(true)
    expect(r0.diagnostic).toContain('deferred')
  })
})
