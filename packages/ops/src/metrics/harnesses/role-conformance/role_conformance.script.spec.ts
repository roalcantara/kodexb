import { describe, expect, it } from 'bun:test'
import { buildReport, deriveDirCoverage, renderReportMd, toBaseline } from './role_conformance.script'

describe('role_conformance runner', () => {
  it('builds rows + metrics from in-memory files', () => {
    const files = [
      { path: 'src/core/a.util.ts', source: 'export const a=1' },
      { path: 'src/shell/main/b.util.ts', source: "import 'node:os'" }
    ]
    const report = buildReport(files, { lockedDirs: 1, roleDirs: 2 })
    expect(report.results.totalUtil).toBe(2)
    expect(report.results.mislabeledUtilCount).toBe(1)
    expect(report.rows.find(r => r.path.endsWith('b.util.ts'))?.verdict).toBe('rename')
    expect(report.summary).toBe('PASS')
  })

  it('deriveDirCoverage counts unique role dirs', () => {
    const files = [
      { path: 'src/core/a.util.ts', source: '' },
      { path: 'src/core/b.util.ts', source: '' },
      { path: 'src/shell/main/c.util.ts', source: '' }
    ]
    const result = deriveDirCoverage(files)
    expect(result.roleDirs).toBe(2)
    expect(result.lockedDirs).toBe(0)
  })

  it('renderReportMd produces markdown with metrics', () => {
    const files = [
      { path: 'src/core/a.util.ts', source: 'export const a=1' }
    ]
    const report = buildReport(files, { lockedDirs: 1, roleDirs: 2 })
    const md = renderReportMd(report)
    expect(md).toContain('# Role-Conformance Report')
    expect(md).toContain('totalUtil')
    expect(md).toContain('| src/core/a.util.ts |')
  })

  it('toBaseline strips rows from report', () => {
    const files = [
      { path: 'src/core/a.util.ts', source: 'export const a=1' },
      { path: 'src/shell/main/b.util.ts', source: "import 'node:os'" }
    ]
    const report = buildReport(files, { lockedDirs: 1, roleDirs: 2 })
    const baseline = toBaseline(report)
    expect((baseline as any).rows).toBeUndefined()
    expect(baseline.results.totalUtil).toBe(2)
    expect(baseline.summary).toBe('PASS')
  })
})
