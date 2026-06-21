import { describe, expect, it } from 'bun:test'
import { catalogPaths } from '../support/catalog_paths.script'
import {
  bunSpec,
  featureFrom,
  planError,
  planGovernanceFeatureSpawn,
  pushUsageFlags,
  requireSub
} from './spec_plan_builders.script'

const FEAT = `${catalogPaths.specs_root}/011-mise-sdd-cli`

describe('spec_plan_builders', () => {
  it('bunSpec prefixes governance specs path', () => {
    expect(bunSpec('lint.script.ts', '--all')).toEqual([
      'bun',
      'packages/ops/src/governance/specs/lint.script.ts',
      '--all'
    ])
  })

  it('featureFrom prefers usage_feature over rest positional', () => {
    expect(featureFrom({ usage_feature: 'a' }, ['b'])).toBe('a')
    expect(featureFrom({}, ['b'])).toBe('b')
  })

  it('requireSub accepts expected action', () => {
    const result = requireSub(['add', '012-demo'], 'add', 'worktree')
    expect('ok' in result && result.ok).toBe(true)
    if ('ok' in result && result.ok) expect(result.tail).toEqual(['012-demo'])
  })

  it('requireSub rejects unknown action', () => {
    const result = requireSub(['nope'], 'add', 'worktree')
    expect(result).toEqual(planError('spec worktree: unknown action nope', 2))
  })

  it('pushUsageFlags maps usage keys to argv flags', () => {
    const argv = ['bun', 'x']
    pushUsageFlags(argv, { usage_strict: 'true', usage_fix: 'true' }, ['strict', 'fix'])
    expect(argv).toEqual(['bun', 'x', '--strict', '--fix'])
  })

  it('planGovernanceFeatureSpawn resolves feature and audit flags', () => {
    const plan = planGovernanceFeatureSpawn(
      'audit.script.ts',
      FEAT,
      { usage_strict: 'true', usage_fix: 'true' },
      {
        strict: true,
        fix: true
      }
    )
    expect(plan.kind).toBe('spawn')
    if (plan.kind === 'spawn') {
      expect(plan.argv.join(' ')).toContain('audit.script.ts')
      expect(plan.argv).toContain('--strict')
      expect(plan.argv).toContain('--fix')
    }
  })
})
