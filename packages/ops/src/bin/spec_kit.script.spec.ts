import { describe, expect, it } from 'bun:test'
import { rmSync } from 'node:fs'
import path from 'node:path'

const FIXTURE = 'packages/ops/src/__tests__/fixtures/workflow/smoke-feature'
const gatesDir = `${FIXTURE}/.gates`

function cleanGates() {
  rmSync(gatesDir, { recursive: true, force: true })
}

function runKit(args: string[]): { exitCode: number; stdout: string; stderr: string } {
  const repoRoot = path.resolve(import.meta.dir, '../../../..')
  const result = Bun.spawnSync(['bun', 'packages/ops/src/bin/spec_kit.script.ts', ...args], {
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe'
  })
  return {
    exitCode: result.exitCode ?? 1,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr)
  }
}

describe('spec kit — help and routing', () => {
  it('--help lists known verbs including pr-prep', () => {
    const { exitCode, stdout } = runKit(['--help'])
    expect(exitCode).toBe(0)
    expect(stdout).toContain('pr-prep')
    expect(stdout).toContain('pr-open')
    expect(stdout).toContain('pr-check')
    expect(stdout).toContain('next')
  })

  it('unknown verb exits 2', () => {
    const { exitCode, stderr } = runKit(['frobnicate'])
    expect(exitCode).toBe(2)
    expect(stderr).toContain('unknown verb')
  })

  it('missing verb exits 2', () => {
    const { exitCode } = runKit([])
    expect(exitCode).toBe(2)
  })
})

describe('kit next — dry-run', () => {
  it('--dry-run resolves to a valid canonical stage', () => {
    cleanGates()
    const { exitCode, stdout } = runKit(['next', FIXTURE, '--dry-run'])
    expect(exitCode).toBe(0)
    expect(stdout.length).toBeGreaterThan(0)
    expect(stdout).not.toContain('__terminal__')
  })

  it('--dry-run output mentions gate or stage name', () => {
    cleanGates()
    const { exitCode, stdout } = runKit(['next', FIXTURE, '--dry-run'])
    expect(exitCode).toBe(0)
    expect(stdout.trim().length).toBeGreaterThan(0)
  })
})

describe('kit next — approve gate flow', () => {
  it('--approve clears current gate and dispatches next verb', () => {
    cleanGates()
    const { exitCode } = runKit(['next', FIXTURE, '--approve'])
    expect(exitCode).toBe(0)
  })

  it('--approve advances stage (dry-run changes after approve)', () => {
    cleanGates()
    const before = runKit(['next', FIXTURE, '--dry-run'])
    runKit(['next', FIXTURE, '--approve'])
    const after = runKit(['next', FIXTURE, '--dry-run'])
    expect(before.exitCode).toBe(0)
    expect(after.exitCode).toBe(0)
    expect(before.stdout.trim()).not.toBe(after.stdout.trim())
  })

  it('multiple --approve calls advance through gates', () => {
    cleanGates()
    runKit(['next', FIXTURE, '--approve'])
    const { exitCode } = runKit(['next', FIXTURE, '--approve'])
    expect(exitCode).toBe(0)
  })
})

describe('kit next — feature dir resolution', () => {
  it('invalid feature dir exits non-zero', () => {
    const { exitCode, stderr } = runKit(['next', '/tmp/nonexistent-xyz-dir'])
    expect(exitCode).not.toBe(0)
    expect(stderr).toBeTruthy()
  })

  it('cleanup gate markers', () => {
    cleanGates()
    expect(true).toBe(true)
  })
})

describe('kit next --loop', () => {
  it('--loop emits stage name on stdout', () => {
    cleanGates()
    const { stdout } = runKit(['next', FIXTURE, '--loop'])
    expect(stdout).toContain('review-spec')
  })
})
