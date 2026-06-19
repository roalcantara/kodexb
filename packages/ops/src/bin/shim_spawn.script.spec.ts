import { describe, expect, it } from 'bun:test'
import { REPO_ROOT, spawnScript } from './shim_spawn.script'

describe('spawnScript', () => {
  it('runs bun with the given script path from repo root', () => {
    const { exitCode, stdout } = spawnScript(`${REPO_ROOT}/bin/policy.script.ts`)
    expect(exitCode).toBe(0)
    expect(stdout).toContain('policy check')
  })
})
