import { describe, expect, it } from 'bun:test'
import { EnvelopeSchema } from '@kb/workflow-core'
import { Value } from '@sinclair/typebox/value'

describe('EnvelopeSchema', () => {
  it('validates a DONE envelope', () => {
    const env = {
      schema_version: '009.1.0',
      stage: 'specify',
      status: 'DONE',
      artifacts_created: ['spec.md'],
      evidence: [{ kind: 'command', ref: 'mise run spec lint', expected: 'exit 0' }],
      diagnostics: [],
      retry_count: 0,
      elapsed_ms: 42
    }
    const result = Value.Check(EnvelopeSchema, env)
    expect(result).toBe(true)
  })

  it('accepts RETRYABLE_FAILURE with diagnostic codes', () => {
    const env = {
      schema_version: '009.1.0',
      stage: 'review',
      status: 'RETRYABLE_FAILURE',
      artifacts_created: ['tmp/handoffs/review-feature.md'],
      evidence: [{ kind: 'artifact', ref: 'tmp/handoffs/review-feature.md' }],
      diagnostics: [
        { code: 'REVIEW_FIX_REQUIRED', message: 'Issues found', severity: 'error', remediation: 'See review handoff' }
      ],
      retry_count: 1,
      elapsed_ms: 1500
    }
    expect(Value.Check(EnvelopeSchema, env)).toBe(true)
    expect(env.status).toBe('RETRYABLE_FAILURE')
    expect(env.diagnostics[0].code).toBe('REVIEW_FIX_REQUIRED')
  })

  it('accepts DONE with REVIEW_APPROVE diagnostic', () => {
    const env = {
      schema_version: '009.1.0',
      stage: 'review',
      status: 'DONE',
      artifacts_created: [],
      evidence: [],
      diagnostics: [{ code: 'REVIEW_APPROVE', message: 'Review passed', severity: 'info' }],
      retry_count: 0,
      elapsed_ms: 500
    }
    expect(Value.Check(EnvelopeSchema, env)).toBe(true)
    expect(env.status).toBe('DONE')
    expect(env.diagnostics[0].code).toBe('REVIEW_APPROVE')
  })
})
