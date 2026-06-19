import { describe, expect, it } from 'bun:test'
import { Value } from '@sinclair/typebox/value'
import { PROFILE_SCHEMA_VERSION, ProfileSchema } from './profile.schema'

function makeValidProfile(): unknown {
  return {
    schema_version: PROFILE_SCHEMA_VERSION,
    name: 'default',
    execution_policy: { allowed_prefixes: ['bun run', 'echo'] },
    stages: [
      { id: 'specify', worker: 'primary' },
      { id: 'plan', worker: 'primary' }
    ],
    transitions: [{ from: 'specify', to: 'plan', on: 'DONE' }],
    terminal: ['gate'],
    default_retry: {
      max_attempts: 3,
      backoff: 'exponential',
      base_ms: 500,
      cap_ms: 30000,
      jitter: 'full',
      reset_on_new_cause: true,
      escalation_event: 'stage.escalated'
    },
    memory: {
      conflict: 'prompt_user',
      retention: { tmp_days: 30, durable_days: 365 }
    },
    providers: {},
    shutdown: { grace_ms: 10000, signals: ['SIGINT', 'SIGTERM'] }
  }
}

describe('ProfileSchema', () => {
  it('AWO-11 AC1: validates a valid profile (sandbox optional)', () => {
    expect(Value.Check(ProfileSchema, makeValidProfile())).toBe(true)
  })

  it('requires execution_policy with allowed_prefixes', () => {
    const base = makeValidProfile() as Record<string, unknown>
    const noPolicy = { ...base, execution_policy: { allowed_prefixes: [] } }
    expect(Value.Check(ProfileSchema, noPolicy)).toBe(false)
  })

  it('rejects missing execution_policy entirely', () => {
    const { execution_policy: _, ...rest } = makeValidProfile() as Record<string, unknown>
    expect(Value.Check(ProfileSchema, rest)).toBe(false)
  })

  it('AWO-11 AC1: accepts optional sandbox on a stage', () => {
    const base = makeValidProfile() as Record<string, unknown>
    const withSandbox = {
      ...base,
      stages: [
        {
          id: 'specify',
          worker: 'primary',
          sandbox: {
            tool_allowlist: ['bun.run'],
            fs_scope: { allow_roots: ['\x24{WORKSPACE_ROOT}'] },
            secret_handling: 'redacted',
            network: 'offline'
          }
        }
      ]
    }
    expect(Value.Check(ProfileSchema, withSandbox)).toBe(true)
  })
})
