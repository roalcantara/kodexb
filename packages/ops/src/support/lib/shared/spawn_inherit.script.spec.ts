import { describe, expect, it } from 'bun:test'
import path from 'node:path'
import { runInherit } from './spawn_inherit.script'

const ROOT = path.resolve(import.meta.dir, '../../../../../../..')

describe('runInherit', () => {
  it('returns exit code 0 for a successful command', () => {
    const code = runInherit(['true'], ROOT)
    expect(code).toBe(0)
  })

  it('returns non-zero exit code for a failing command', () => {
    const code = runInherit(['false'], ROOT)
    expect(code).toBe(1)
  })

  it('strips usage_* env vars from child', () => {
    process.env.usage_foo = 'true'
    const code = runInherit(['bash', '-c', 'test -z "$usage_foo"'], ROOT)
    delete process.env.usage_foo
    expect(code).toBe(0)
  })

  it('passes envOverlay to child even when key conflicts with usage_*', () => {
    process.env.usage_bar = 'true'
    const code = runInherit(['bash', '-c', 'test "$usage_bar" = "overlaid"'], ROOT, { usage_bar: 'overlaid' })
    delete process.env.usage_bar
    expect(code).toBe(0)
  })

  it('preserves PATH in child env', () => {
    const before = process.env.PATH
    const code = runInherit(['bash', '-c', 'test -n "$PATH"'], ROOT)
    expect(code).toBe(0)
    expect(process.env.PATH).toBe(before)
  })
})
