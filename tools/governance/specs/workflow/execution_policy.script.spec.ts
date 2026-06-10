import { describe, expect, it } from 'bun:test'
import type { ExecutionPolicyValidation } from './execution_policy.script.ts'
import { validateCommandPrefix, validateExecutionPolicy } from './execution_policy.script.ts'

describe('validateCommandPrefix', () => {
  const PREFIXES = ['bun run', 'echo']

  it('matches a command with an allowed prefix', () => {
    const result = validateCommandPrefix('bun run test', PREFIXES)
    expect(result.matched).toBe(true)
    expect(result.matchedPrefix).toBe('bun run')
  })

  it('matches a single-word command', () => {
    const result = validateCommandPrefix('echo hello', PREFIXES)
    expect(result.matched).toBe(true)
  })

  it('rejects a command with a disallowed prefix', () => {
    const result = validateCommandPrefix('npm install', PREFIXES)
    expect(result.matched).toBe(false)
    expect(result.diagnostic).toBeDefined()
  })

  it('rejects an empty prefix match (partial token)', () => {
    const result = validateCommandPrefix('bunx something', PREFIXES)
    expect(result.matched).toBe(false)
  })

  it('handles whitespace normalization', () => {
    const result = validateCommandPrefix('  bun   run   test  ', PREFIXES)
    expect(result.matched).toBe(true)
    expect(result.matchedPrefix).toBe('bun run')
  })

  it('matches a bare prefix (command equals prefix)', () => {
    const result = validateCommandPrefix('bun run', PREFIXES)
    expect(result.matched).toBe(true)
  })
})

describe('validateExecutionPolicy', () => {
  it('allows all commands with valid prefixes', () => {
    const results = validateExecutionPolicy(['bun run test', 'echo ok'], ['bun run', 'echo'])
    expect(results.every(r => r.overall === 'allowed')).toBe(true)
  })

  it('rejects commands with invalid prefixes', () => {
    const results = validateExecutionPolicy(['npm install'], ['bun run'])
    const r0 = results[0] as ExecutionPolicyValidation
    expect(r0.overall).toBe('rejected')
  })

  it('handles mixed valid and invalid commands', () => {
    const results = validateExecutionPolicy(['bun run test', 'hk check'], ['bun run'])
    const r0 = results[0] as ExecutionPolicyValidation
    const r1 = results[1] as ExecutionPolicyValidation
    expect(r0.overall).toBe('allowed')
    expect(r1.overall).toBe('rejected')
  })
})
