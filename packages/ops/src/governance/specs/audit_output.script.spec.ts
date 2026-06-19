import { describe, expect, it } from 'bun:test'
import type { AuditResult } from './audit_core.script'

function captureLog(fn: () => void): string[] {
  const lines: string[] = []
  const saved = console.log
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(' '))
  }
  try {
    fn()
  } finally {
    console.log = saved
  }
  return lines
}

function makeResult(overrides: Partial<AuditResult> = {}): AuditResult {
  return {
    featureDir: 'packages/ops/src/__tests__/fixtures/000-feature-demo',
    phase: { name: 'analyze-tasks', command: 'speckit.analyze' },
    findings: [
      { rule: 'quartet.handoff', level: 'error', file: 'handoff.md', message: 'Missing handoff.md' },
      { rule: 'tasks.sample-leak', level: 'error', file: 'tasks.md', message: 'Sample leak' },
      { rule: 'tasks.checkbox', level: 'warn', file: 'tasks.md', message: 'No checkboxes' }
    ],
    summary: { total: 3, errors: 2, warns: 1, infos: 0 },
    ...overrides
  }
}

describe('audit_output', () => {
  it('json output has stable top-level keys', async () => {
    const mod = await import('./audit_output.script')
    const lines = captureLog(() => {
      mod.renderAudit(makeResult(), 'json')
    })
    expect(lines.length).toBeGreaterThan(0)
    const parsed = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>
    expect(parsed).toHaveProperty('featureDir')
    expect(parsed).toHaveProperty('phase')
    expect(parsed).toHaveProperty('findings')
    expect(parsed).toHaveProperty('summary')
    const summary = parsed.summary as Record<string, unknown>
    expect(summary).toHaveProperty('total')
    expect(summary).toHaveProperty('errors')
    expect(summary).toHaveProperty('warns')
    expect(summary).toHaveProperty('infos')
  })

  it('raw output includes findings with severity labels', async () => {
    const mod = await import('./audit_output.script')
    const lines = captureLog(() => {
      mod.renderAudit(makeResult(), 'raw')
    })
    const joined = lines.join('\n')
    expect(joined).toContain('ERROR')
    expect(joined).toContain('WARN')
  })

  it('clean result prints OK summary', async () => {
    const mod = await import('./audit_output.script')
    const lines = captureLog(() => {
      const clean = makeResult({ findings: [], summary: { total: 0, errors: 0, warns: 0, infos: 0 } })
      mod.renderAudit(clean, 'raw')
    })
    const joined = lines.join('\n')
    expect(joined).toContain('OK')
  })

  it('warns-only result renders warnings in pretty mode', async () => {
    const mod = await import('./audit_output.script')
    const lines = captureLog(() => {
      const warnsOnly = makeResult({
        findings: [{ rule: 'tasks.checkbox', level: 'warn', file: 'tasks.md', message: 'No checkboxes' }],
        summary: { total: 1, errors: 0, warns: 1, infos: 0 }
      })
      mod.renderAudit(warnsOnly, 'pretty')
    })
    const joined = lines.join('\n')
    expect(joined).toContain('warning')
    expect(joined).toContain('warn')
  })

  it('chooseRenderer returns correct modes', async () => {
    const mod = await import('./audit_output.script')
    expect(mod.chooseRenderer({ json: true, raw: false, isTty: true })).toBe('json')
    expect(mod.chooseRenderer({ json: false, raw: true, isTty: true })).toBe('raw')
    expect(mod.chooseRenderer({ json: false, raw: false, isTty: false })).toBe('raw')
  })
})
