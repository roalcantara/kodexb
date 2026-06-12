import { describe, expect, it } from 'bun:test'
import { Value } from '@sinclair/typebox/value'
import { PersistedRunState, STATE_SCHEMA_VERSION } from './state.schema'

function makeValidState(): unknown {
  return {
    schema_version: STATE_SCHEMA_VERSION,
    run_id: 'test-run-001',
    profile_name: 'default',
    profile_schema_version: '009.1.0',
    started_at: '2026-06-09T12:00:00.000Z',
    last_persisted_at: '2026-06-09T12:30:00.000Z',
    xstate_snapshot: { status: 'active', value: 'specify', done: false },
    shared_memory: {}
  }
}

describe('PersistedRunState schema', () => {
  it('validates a valid run state', () => {
    expect(Value.Check(PersistedRunState, makeValidState())).toBe(true)
  })

  it('rejects wrong schema_version literal', () => {
    const base = makeValidState() as Record<string, unknown>
    expect(Value.Check(PersistedRunState, { ...base, schema_version: 'bad' })).toBe(false)
  })

  it('requires run_id', () => {
    const { run_id: _, ...rest } = makeValidState() as Record<string, unknown>
    expect(Value.Check(PersistedRunState, rest)).toBe(false)
  })

  it('accepts optional shutdown_reason', () => {
    const base = makeValidState() as Record<string, unknown>
    const withReason = { ...base, shutdown_reason: 'SIGINT' }
    expect(Value.Check(PersistedRunState, withReason)).toBe(true)
  })

  it('round-trips JSON serialization', () => {
    const original = makeValidState()
    const serialized = JSON.stringify(original)
    const parsed = JSON.parse(serialized)
    expect(Value.Check(PersistedRunState, parsed)).toBe(true)
  })
})
