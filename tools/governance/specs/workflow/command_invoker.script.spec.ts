import { describe, expect, it } from 'bun:test'
import { runCommand, runCommandAsync } from './command_invoker.script.ts'

const ALLOWED = ['bun run', 'echo', 'mkdir']
const RESTRICTED = ['echo']

describe('command_invoker — prefix enforcement (AWO-9.2)', () => {
  it('runs a command with allowed prefix', () => {
    const result = runCommand({ command: 'echo hello' }, ALLOWED)
    expect(result.rejected).toBeUndefined()
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe('hello')
  })

  it('rejects a command with disallowed prefix', () => {
    const result = runCommand({ command: 'npm install' }, ALLOWED)
    expect(result.rejected).toBe(true)
    expect(result.exitCode).toBe(-1)
  })

  it('rejects a command not in restricted profile', () => {
    const result = runCommand({ command: 'bun run test' }, RESTRICTED)
    expect(result.rejected).toBe(true)
  })

  it('outputs command stdout', () => {
    const result = runCommand({ command: 'echo hello world' }, ALLOWED)
    expect(result.stdout.trim()).toBe('hello world')
  })

  it('captures stderr', () => {
    const result = runCommand({ command: 'echo error >&2' }, ALLOWED)
    expect(result.stderr.trim()).toBe('error')
  })

  it('measures duration', () => {
    const result = runCommand({ command: 'echo quick' }, ALLOWED)
    expect(result.durationMs).toBeGreaterThan(0)
  })
})

describe('command_invoker — prefix rejection (AWO-9.2)', () => {
  it('returns COMMAND_PREFIX_REJECTED for disallowed prefix', () => {
    const result = runCommand({ command: 'nonexistent_command_xyz123' }, ALLOWED)
    expect(result.rejected).toBe(true)
    expect(result.diagnostic?.code).toBe('COMMAND_PREFIX_REJECTED')
  })
})

describe('runCommandAsync', () => {
  it('echo async exits 0 with stdout', async () => {
    const handle = runCommandAsync({ command: 'echo async' }, ['echo'])
    const result = await handle.promise
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe('async')
  })

  it('rejects disallowed prefix', async () => {
    const handle = runCommandAsync({ command: 'rm -rf /' }, ['echo'])
    const result = await handle.promise
    expect(result.rejected).toBe(true)
    expect(result.diagnostic?.code).toBe('COMMAND_PREFIX_REJECTED')
  })

  it('times out long command', async () => {
    const handle = runCommandAsync({ command: 'sleep 2', timeout_ms: 100 }, ['sleep', 'echo'])
    const t0 = performance.now()
    const result = await handle.promise
    expect(performance.now() - t0).toBeLessThan(500)
    expect(result.rejected).toBe(true)
  })
})
