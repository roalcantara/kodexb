import { describe, expect, it } from 'bun:test'
import { validateCommandPrefix } from '@kb/workflow-core'
import { runCommand } from '@kb/workflow-runtime'

const FIXTURE_PREFIXES = ['bun run', 'echo']

describe('MVP-CONFORMANCE-02: policy plumbing with fixture prefixes', () => {
  it('allows fixture prefix: bun run', () => {
    const match = validateCommandPrefix('bun run test', FIXTURE_PREFIXES)
    expect(match.matched).toBe(true)
  })

  it('allows fixture prefix: echo', () => {
    const match = validateCommandPrefix('echo ok', FIXTURE_PREFIXES)
    expect(match.matched).toBe(true)
  })

  it('rejects non-fixture prefix: mise run', () => {
    const match = validateCommandPrefix('mise run spec lint', FIXTURE_PREFIXES)
    expect(match.matched).toBe(false)
  })

  it('rejects non-fixture prefix: hk check', () => {
    const match = validateCommandPrefix('hk check', FIXTURE_PREFIXES)
    expect(match.matched).toBe(false)
  })

  it('rejects non-fixture prefix: gh pr', () => {
    const match = validateCommandPrefix('gh pr create', FIXTURE_PREFIXES)
    expect(match.matched).toBe(false)
  })

  it('whitespace-normalized match works', () => {
    const match = validateCommandPrefix('  bun   run   test  ', FIXTURE_PREFIXES)
    expect(match.matched).toBe(true)
  })

  it('adapter enforces fixture prefixes', () => {
    const result = runCommand({ command: 'echo fixture-allowed' }, FIXTURE_PREFIXES)
    expect(result.rejected).toBeUndefined()
  })

  it('adapter blocks non-fixture prefix via spawn rejection', () => {
    const result = runCommand({ command: 'mise run spec' }, FIXTURE_PREFIXES)
    expect(result.rejected).toBe(true)
    expect(result.diagnostic?.code).toBe('COMMAND_PREFIX_REJECTED')
  })
})
