import { describe, expect, it } from 'bun:test'
import { Value } from '@sinclair/typebox/value'
import { ENVELOPE_SCHEMA_VERSION, EnvelopeSchema, EvidenceEntry } from './envelope.schema.ts'

function makeValidEnvelope(): unknown {
  return {
    schema_version: ENVELOPE_SCHEMA_VERSION,
    stage: 'specify',
    status: 'DONE',
    artifacts_created: ['docs/specs/NNN-feature/spec.md'],
    evidence: [
      { kind: 'command', ref: 'bun run tools/check.sh' },
      { kind: 'artifact', ref: 'docs/specs/NNN-feature/spec.md' },
      { kind: 'marker', ref: 'checklists/ux.md' }
    ],
    diagnostics: [],
    retry_count: 0,
    elapsed_ms: 1500
  }
}

describe('EnvelopeSchema', () => {
  it('validates a DONE envelope', () => {
    expect(Value.Check(EnvelopeSchema, makeValidEnvelope())).toBe(true)
  })

  it('accepts NEED_INPUT status', () => {
    const base = makeValidEnvelope() as Record<string, unknown>
    const e = { ...base, status: 'NEED_INPUT' }
    expect(Value.Check(EnvelopeSchema, e)).toBe(true)
  })

  it('rejects unknown status', () => {
    const base = makeValidEnvelope() as Record<string, unknown>
    const e = { ...base, status: 'UNKNOWN' }
    expect(Value.Check(EnvelopeSchema, e)).toBe(false)
  })

  it('rejects missing required fields', () => {
    const { stage: _, ...rest } = makeValidEnvelope() as Record<string, unknown>
    expect(Value.Check(EnvelopeSchema, rest)).toBe(false)
  })
})

describe('EvidenceEntry.kind — toolchain-neutral', () => {
  it('allows command/artifact/marker', () => {
    const validKinds = ['command', 'artifact', 'marker']
    for (const kind of validKinds) {
      expect(Value.Check(EvidenceEntry, { kind, ref: 'test' })).toBe(true)
    }
  })

  it('rejects toolchain-specific kind values', () => {
    const badKinds = ['mise_task', 'hk_profile', 'bun_spawn', 'gh_pr']
    for (const kind of badKinds) {
      expect(Value.Check(EvidenceEntry, { kind, ref: 'test' })).toBe(false)
    }
  })
})
