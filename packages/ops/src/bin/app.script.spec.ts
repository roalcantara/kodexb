import { describe, expect, it } from 'bun:test'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { REPO_ROOT, spawnScript } from '../support/lib/testing/spawn_bin.script'
import { gateSteps, selectGates } from './app.script'

describe('selectGates', () => {
  const cases = [
    {
      name: 'neither flag runs both (default-dual, rule 07)',
      q: false,
      p: false,
      want: { quality: true, policy: true }
    },
    { name: 'quality only', q: true, p: false, want: { quality: true, policy: false } },
    { name: 'policy only', q: false, p: true, want: { quality: false, policy: true } },
    { name: 'both flags run both', q: true, p: true, want: { quality: true, policy: true } }
  ]
  for (const { name, q, p, want } of cases) {
    it(name, () => {
      expect(selectGates(q, p)).toEqual(want)
    })
  }
})

describe('gateSteps', () => {
  it('default-dual yields quality then policy steps', () => {
    const steps = gateSteps({ quality: true, policy: true })
    expect(steps.map(s => s.id)).toEqual(['quality', 'policy'])
  })

  it('quality-only yields a single quality step', () => {
    const steps = gateSteps({ quality: true, policy: false })
    expect(steps).toHaveLength(1)
  })

  it('every step carries a command argv (gum spin capable)', () => {
    for (const step of gateSteps({ quality: true, policy: true })) {
      expect(Array.isArray(step.command) && step.command.length > 0).toBe(true)
    }
  })
})

describe('shim integration', () => {
  it('root bin/app.script.ts has correct stub content', () => {
    const content = readFileSync(resolve(REPO_ROOT, 'bin/app.script.ts'), 'utf-8')
    expect(content).toContain("import '../packages/ops/src/bin/app.script.ts'")
  })

  it('root bin/app.script.ts imports silently', async () => {
    let caught: unknown = null
    try {
      await import(resolve(REPO_ROOT, 'bin/app.script.ts'))
    } catch (e) {
      caught = e
    }
    expect(caught).toBeNull()
  })

  it('packages/ops/src/bin/app.script.ts exports selectGates', async () => {
    const mod = await import('./app.script')
    expect(typeof mod.selectGates).toBe('function')
  })

  it('spawns quality gate with usage_cmd=gates usage_quality=true (stubbed)', () => {
    const gateSh = resolve(REPO_ROOT, '.agents/skills/app-quality-gate/scripts/gate.sh')
    const backup = readFileSync(gateSh, 'utf-8')
    try {
      writeFileSync(gateSh, '#!/usr/bin/env bash\necho "stub: gate OK"\nexit 0\n')
      const { exitCode, stdout } = spawnScript(resolve(REPO_ROOT, 'bin/app.script.ts'), {
        usage_cmd: 'gates',
        usage_quality: 'true',
        usage_policy: 'false',
        usage_raw: 'true'
      })
      expect(exitCode).toBe(0)
      expect(stdout).toContain('quality')
      expect(stdout).toContain('ok')
    } finally {
      writeFileSync(gateSh, backup)
    }
  })
})
