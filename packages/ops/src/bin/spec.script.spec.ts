import { afterEach, describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { findActiveRun, listActiveRuns } from '@kb/exec'
import { catalogPaths } from '../governance/support/catalog_paths.script'
import {
  ALLOWED_WORKFLOW_NAMES,
  planSpec,
  rawJsonConflict,
  resolveSpecGateFeatureDir,
  type SpecPlan,
  validateWorkflowName
} from './spec.script'

// A real feature dir (built from the specs-root constant, not a literal — the
// `no-inbound-assets-specs-ts` ast-grep rule bans hardcoded assets/specs/* in TS)
// so resolveSpecFeatureDir resolves deterministically.
const FEAT = `${catalogPaths.specs_root}/011-mise-sdd-cli`
const spawnArgv = (p: SpecPlan): string[] => (p.kind === 'spawn' ? p.argv : [])

/** Invoke a branch with explicit env (no reliance on process env or a TTY). */
function plan(cmd: string, rest: string[], env: Record<string, string | undefined> = {}): SpecPlan {
  return planSpec(cmd, rest, env, { activeRun: () => 'ACTIVE' })
}

describe('planSpec — every subcommand routes', () => {
  it('lint with positional feature passes the dir (no --all)', () => {
    const argv = spawnArgv(plan('lint', [], { usage_feature: 'feature/x' }))
    expect(argv).toContain('feature/x')
    expect(argv).not.toContain('--all')
  })
  it('lint with no feature falls back to --all', () => {
    expect(spawnArgv(plan('lint', []))).toContain('--all')
  })
  it('trace routes to trace.script with the feature', () => {
    const argv = spawnArgv(plan('trace', [], { usage_feature: FEAT, usage_strict: 'true' }))
    expect(argv[1]).toContain('trace.script.ts')
    expect(argv).toContain('--strict')
  })
  it('gate resolves a runner plan for the feature', () => {
    const p = plan('gate', [], { usage_feature: FEAT })
    expect(p.kind).toBe('runner')
    if (p.kind === 'runner') expect(p.featureDir.endsWith('011-mise-sdd-cli')).toBe(true)
  })
  it('test routes scope + feature positionally (no --feat)', () => {
    const argv = spawnArgv(plan('test', [], { usage_scope: 'unit', usage_feature: FEAT }))
    expect(argv).toEqual(['bun', expect.stringContaining('spec_test.script.ts'), 'unit', FEAT])
    expect(argv).not.toContain('--feat')
  })
  it('init passes --id/--slug', () => {
    const argv = spawnArgv(plan('init', [], { usage_id: '012', usage_slug: 'demo' }))
    expect(argv).toContain('012')
    expect(argv).toContain('demo')
  })
  it('worktree add routes to worktree-add.sh with the feature', () => {
    const argv = spawnArgv(plan('worktree', ['add'], { usage_feature: '012-demo' }))
    expect(argv.join(' ')).toContain('worktree-add.sh')
    expect(argv).toContain('012-demo')
  })
  it('worktree unknown action errors', () => {
    expect(plan('worktree', ['nope']).kind).toBe('error')
  })
  it('opencode check routes to opencode_check.sh', () => {
    expect(spawnArgv(plan('opencode', ['check'])).join(' ')).toContain('opencode_check.sh')
  })
  it('library manifest passes --dry-run/--verify', () => {
    const argv = spawnArgv(plan('library', ['manifest'], { usage_dry_run: 'true', usage_verify: 'true' }))
    expect(argv).toContain('--dry-run')
    expect(argv).toContain('--verify')
  })
  it('workflow run (default) delegates to spec_kit.script.ts next', () => {
    const argv = spawnArgv(plan('workflow', ['run'], { usage_feature: FEAT, usage_dry_run: 'true' }))
    expect(argv.join(' ')).toContain('spec_kit.script.ts')
    expect(argv).toContain('next')
    expect(argv).toContain(FEAT)
    expect(argv).toContain('--dry-run')
  })

  it('workflow run non-dry includes --loop', () => {
    const argv = spawnArgv(plan('workflow', ['run'], { usage_feature: FEAT }))
    expect(argv.join(' ')).toContain('spec_kit.script.ts')
    expect(argv).toContain('--loop')
  })
  it('workflow resume uses provided runId', () => {
    const testEnv: Record<string, string> = {}
    testEnv.usage_runId = 'R1'
    testEnv.usage_answer = 'q=1'
    const argv = spawnArgv(plan('workflow', ['resume'], testEnv))
    expect(argv).toContain('R1')
    expect(argv).toContain('--answer')
  })
  it('workflow resume falls back to active run', () => {
    const argv = spawnArgv(plan('workflow', ['resume'], {}))
    expect(argv).toContain('ACTIVE')
  })
  it('workflow runs routes the action', () => {
    const argv = spawnArgv(plan('workflow', ['runs'], { usage_action: 'list' }))
    expect(argv.join(' ')).toContain('runs_cli.script.ts')
    expect(argv).toContain('list')
  })
  it('workflow handoff generate routes with feature + focus', () => {
    const argv = spawnArgv(plan('workflow', ['handoff', 'generate'], { usage_feature: FEAT, usage_focus: 'gherkin' }))
    expect(argv.join(' ')).toContain('handoff_generate.script.ts')
    expect(argv).toContain('--focus')
  })
  it('workflow handoff scrub routes to handoff_scrub', () => {
    expect(spawnArgv(plan('workflow', ['handoff', 'scrub'])).join(' ')).toContain('handoff_scrub.script.ts')
  })
  it('audit feature resolves the dir', () => {
    const argv = spawnArgv(plan('audit', ['feature'], { usage_feature: FEAT, usage_strict: 'true' }))
    expect(argv.join(' ')).toContain('audit.script.ts')
    expect(argv).toContain('--strict')
  })
  it('flat audit autodetects active feature', () => {
    const argv = spawnArgv(plan('audit', [], { usage_strict: 'true' }))
    expect(argv.join(' ')).toContain('audit.script.ts')
    expect(argv).toContain('--strict')
  })
  it('flat audit passes --fix flags', () => {
    const argv = spawnArgv(
      plan('audit', [], { usage_feature: FEAT, usage_fix: 'true', usage_dry_run: 'true', usage_force: 'true' })
    )
    expect(argv).toContain('--fix')
    expect(argv).toContain('--dry-run')
    expect(argv).toContain('--force')
  })
  it('conform routes to conform.script.ts', () => {
    const argv = spawnArgv(plan('conform', [], { usage_feature: FEAT, usage_dry_run: 'true' }))
    expect(argv.join(' ')).toContain('conform.script.ts')
    expect(argv).toContain('--dry-run')
  })
  it('audit security routes to scan.script', () => {
    const argv = spawnArgv(plan('audit', ['security'], { usage_changed_only: 'true' }))
    expect(argv.join(' ')).toContain('scan.script.ts')
    expect(argv).toContain('--changed-only')
  })
  it('audit security passes --strict', () => {
    const argv = spawnArgv(plan('audit', ['security'], { usage_strict: 'true' }))
    expect(argv).toContain('--strict')
  })
  it('audit security passes --base', () => {
    const argv = spawnArgv(plan('audit', ['security'], { usage_base: 'main' }))
    expect(argv).toContain('--base')
    expect(argv).toContain('main')
  })
  it('ready resolves a runner plan', () => {
    expect(plan('ready', [], { usage_feature: FEAT }).kind).toBe('runner')
  })
  it('closeout resolves a spec-closeout runner plan', () => {
    const p = plan('closeout', [], { usage_feature: FEAT })
    expect(p.kind).toBe('runner')
    if (p.kind === 'runner') expect(p.task).toBe('spec-closeout')
  })
  it('ready --phase routes to phase.script when commit is absent', () => {
    const argv = spawnArgv(plan('ready', [], { usage_feature: FEAT, usage_phase: '3' }))
    expect(argv.join(' ')).toContain('phase.script.ts')
    expect(argv).toContain('3')
  })
  it('ready --phase with --commit routes to runner not phase.script', () => {
    const p = plan('ready', [], { usage_feature: FEAT, usage_phase: 'C1', usage_commit: 'true' })
    expect(p.kind).toBe('runner')
    if (p.kind === 'runner') expect(p.task).toBe('spec-ready')
  })
  it('ready --commit routes to runner', () => {
    const p = plan('ready', [], { usage_feature: FEAT, usage_commit: 'true' })
    expect(p.kind).toBe('runner')
  })
  it('review-handoff routes the action', () => {
    const argv = spawnArgv(plan('review-handoff', [], { usage_action: 'classify' }))
    expect(argv.join(' ')).toContain('review_handoff.script.ts')
    expect(argv).toContain('classify')
  })
  it('unknown subcommand errors', () => {
    const p = plan('frobnicate', [])
    expect(p.kind).toBe('error')
    if (p.kind === 'error') expect(p.message).toContain('unknown action')
  })
  it('kit routes to spec_kit.script via spawn', () => {
    const argv = spawnArgv(plan('kit', []))
    expect(argv.join(' ')).toContain('spec_kit.script.ts')
  })
})

describe('planSpec — global flags', () => {
  it('--raw + --json conflict aborts before dispatch', () => {
    const p = plan('lint', [], { usage_raw: 'true', usage_json: 'true' })
    expect(p.kind).toBe('error')
    if (p.kind === 'error') expect(p.message).toContain('mutually exclusive')
  })
  it('global --json propagates to audit feature argv', () => {
    expect(spawnArgv(plan('audit', ['feature'], { usage_feature: FEAT, usage_json: 'true' }))).toContain('--json')
  })
  it('global --raw propagates to audit feature argv', () => {
    expect(spawnArgv(plan('audit', ['feature'], { usage_feature: FEAT, usage_raw: 'true' }))).toContain('--raw')
  })
  it('global --json carries into the gate runner plan', () => {
    const p = plan('gate', [], { usage_feature: FEAT, usage_json: 'true' })
    expect(p.kind === 'runner' && p.json).toBe(true)
  })
  it('global --raw carries into the ready runner plan', () => {
    const p = plan('ready', [], { usage_feature: FEAT, usage_raw: 'true' })
    expect(p.kind === 'runner' && p.raw).toBe(true)
  })
})

describe('spec.script', () => {
  it('exports a dispatch entrypoint module', async () => {
    const mod = await import('./spec.script')
    expect(typeof mod).toBe('object')
  })
})

describe('rawJsonConflict', () => {
  it('reports a conflict when both --raw and --json are set', () => {
    expect(rawJsonConflict(true, true)).toContain('mutually exclusive')
  })

  describe('when at most one is set', () => {
    const cases = [
      { name: 'neither', raw: false, json: false },
      { name: 'raw only', raw: true, json: false },
      { name: 'json only', raw: false, json: true }
    ]
    for (const { name, raw, json } of cases) {
      it(`returns null for ${name}`, () => {
        expect(rawJsonConflict(raw, json)).toBeNull()
      })
    }
  })
})

describe('validateWorkflowName', () => {
  it('returns null for the registered orchestrated-handoff workflow', () => {
    expect(validateWorkflowName('orchestrated-handoff')).toBeNull()
  })

  it('rejects speckit — it is the default workflow and not dispatched through `spec workflow`', () => {
    const err = validateWorkflowName('speckit')
    expect(err).not.toBeNull()
    expect(err).toContain('unknown workflow')
    expect(err).toContain('speckit')
    expect(err).toContain('orchestrated-handoff')
  })

  it('rejects any other unknown name with a helpful list of allowed names', () => {
    const err = validateWorkflowName('orchestrated-sliced')
    expect(err).not.toBeNull()
    expect(err).toContain('unknown workflow')
    expect(err).toContain('orchestrated-sliced')
    for (const allowed of ALLOWED_WORKFLOW_NAMES) {
      expect(err).toContain(allowed)
    }
  })

  it('accepts empty string — mise expands the positional even when the operator omits it; caller decides the default', () => {
    expect(validateWorkflowName('')).toBeNull()
  })
})

describe('resolveSpecGateFeatureDir', () => {
  it('infers the active feature when omitted', () => {
    const result = resolveSpecGateFeatureDir()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.featureDir.endsWith('spec.md') || result.featureDir.length > 0).toBe(true)
    }
  })

  it('accepts an explicit dir and normalizes to the same path as inference', () => {
    const inferred = resolveSpecGateFeatureDir()
    expect(inferred.ok).toBe(true)
    if (!inferred.ok) return
    const explicit = resolveSpecGateFeatureDir(inferred.featureDir)
    expect(explicit.ok).toBe(true)
    if (explicit.ok) {
      expect(explicit.featureDir).toBe(inferred.featureDir)
    }
  })

  it('rejects a path without spec.md', () => {
    const result = resolveSpecGateFeatureDir('/tmp/not-a-feature-dir')
    expect(result.ok).toBe(false)
  })
})

describe('findActiveRun / listActiveRuns', () => {
  const dateStr = new Date().toISOString().slice(0, 10)
  let scratchDir: string

  afterEach(() => {
    if (scratchDir) rmSync(scratchDir, { recursive: true, force: true })
  })

  it('findActiveRun returns sole run id', () => {
    scratchDir = mkdtempSync(path.join(tmpdir(), 'fr-'))
    mkdirSync(path.join(scratchDir, dateStr), { recursive: true })
    writeFileSync(path.join(scratchDir, dateStr, 'foo.state.json'), '{}')

    const active = findActiveRun(scratchDir)
    expect(active).toBe('foo')
  })

  it('listActiveRuns returns sorted with two runs', () => {
    scratchDir = mkdtempSync(path.join(tmpdir(), 'fr-'))
    mkdirSync(path.join(scratchDir, dateStr), { recursive: true })
    writeFileSync(path.join(scratchDir, dateStr, 'zzz.state.json'), '{}')
    writeFileSync(path.join(scratchDir, dateStr, 'aaa.state.json'), '{}')

    expect(findActiveRun(scratchDir)).toBeNull()
    expect(listActiveRuns(scratchDir).length).toBe(2)
  })
})
