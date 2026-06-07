import { describe, expect, it } from 'bun:test'
import {
  defaultPolicy,
  formatRegressionMessage,
  isRegression,
  mergePolicy,
  parseWorkflowObservabilityArgv,
  policyFromBaselineFile,
  regressionThresholdMs
} from './workflow_observability_perf_core.script.ts'

describe('workflow observability perf policy', () => {
  it('defaults regression threshold to max(min delta, pct of baseline)', () => {
    const policy = defaultPolicy()
    expect(regressionThresholdMs(0.14, policy)).toBe(0.25)
    expect(regressionThresholdMs(2, policy)).toBe(0.4)
  })

  it('does not flag CI-style sub-ms noise (0.14 → 0.25ms)', () => {
    const policy = defaultPolicy()
    expect(isRegression(0.14, 0.25, policy)).toBe(false)
  })

  it('flags meaningful regressions (0.14 → 0.40ms)', () => {
    const policy = defaultPolicy()
    expect(isRegression(0.14, 0.4, policy)).toBe(true)
  })

  it('parses CLI overrides', () => {
    const policy = parseWorkflowObservabilityArgv([
      '--regression-pct',
      '30',
      '--regression-min-delta-ms',
      '1',
      '--no-regression',
      '--absolute-p95-ms',
      'next-populated=150'
    ])
    expect(policy.regressionPct).toBe(30)
    expect(policy.regressionMinDeltaMs).toBe(1)
    expect(policy.compareRegression).toBe(false)
    expect(policy.absoluteP95Ms['next-populated']).toBe(150)
  })

  it('loads optional policy from baseline JSON', () => {
    const policy = policyFromBaselineFile({
      policy: { regression_min_delta_ms: 0.5, absolute_p95_ms: { 'handoff-generate': 300 } }
    })
    expect(policy.regressionMinDeltaMs).toBe(0.5)
    expect(policy.absoluteP95Ms['handoff-generate']).toBe(300)
    expect(policy.absoluteP95Ms['next-populated']).toBe(100)
  })

  it('merges baseline policy with CLI overrides', () => {
    const merged = mergePolicy(defaultPolicy(), parseWorkflowObservabilityArgv(['--regression-pct', '10']))
    expect(merged.regressionPct).toBe(10)
    expect(merged.regressionMinDeltaMs).toBe(0.25)
  })

  it('formats regression message with threshold context', () => {
    const msg = formatRegressionMessage('next-populated', 0.14, 0.4, defaultPolicy())
    expect(msg).toContain('REGRESSION: next-populated')
    expect(msg).toContain('threshold 0.25ms')
  })
})
