// @arch_role_taxonomy
import { describe, expect, it } from 'bun:test'
import { buildReport, deriveDirCoverage, parseLockedDirs, renderReportMd, toBaseline } from './role_conformance.script'

const sampleUtilFiles = () => [
  { path: 'src/core/a.util.ts', source: 'export const a=1' },
  { path: 'src/shell/main/b.util.ts', source: "import 'node:os'" }
]

describe('role_conformance runner', () => {
  it('builds rows + metrics from in-memory files', () => {
    const files = sampleUtilFiles()
    const report = buildReport(files, { lockedDirs: 1, roleDirs: 2 })
    expect(report.results.totalUtil).toBe(2)
    expect(report.results.mislabeledUtilCount).toBe(1)
    expect(report.rows.find(r => r.path.endsWith('b.util.ts'))?.verdict).toBe('rename')
    expect(report.summary).toBe('PASS')
  })

  it('flags a drop in enforcedDirRatio against the baseline', () => {
    const files = sampleUtilFiles()
    const baseline = {
      totalUtil: 2,
      mislabeledUtilCount: 1,
      utilPurityRatio: 0.5,
      enforcedDirRatio: 1,
      suffixViolations: 1
    }
    const report = buildReport(files, { lockedDirs: 1, roleDirs: 2 }, baseline)
    const violation = report.violations.find(v => v.metric === 'enforcedDirRatio')
    expect(violation).toBeDefined()
    expect(violation?.value).toBe(0.5)
    expect(violation?.baseline).toBe(1)
    expect(report.summary).toBe('FAIL')
  })

  it('deriveDirCoverage counts locked dirs among the src dirs', () => {
    const srcDirs = new Set(['src/core', 'src/shell/main', 'src/shell/app'])
    const lockedDirs = new Set(['src/core', 'src/shell/app', 'src/not-scanned'])
    const result = deriveDirCoverage(srcDirs, lockedDirs)
    expect(result.roleDirs).toBe(3)
    expect(result.lockedDirs).toBe(2)
  })

  it('parseLockedDirs extracts only src/ keys from the ls-lint ls block', () => {
    const yaml = ['ls:', '  src/core:', '    .ts: regex:x', '  packages/ops:', '    .ts: regex:y', ''].join('\n')
    const locked = parseLockedDirs(yaml)
    expect(locked.has('src/core')).toBe(true)
    expect(locked.has('packages/ops')).toBe(false)
  })

  it('renderReportMd produces markdown with metrics', () => {
    const files = [{ path: 'src/core/a.util.ts', source: 'export const a=1' }]
    const report = buildReport(files, { lockedDirs: 1, roleDirs: 2 })
    const md = renderReportMd(report)
    expect(md).toContain('# Role-Conformance Report')
    expect(md).toContain('totalUtil')
    expect(md).toContain('| src/core/a.util.ts |')
  })

  it('toBaseline strips rows from report', () => {
    const files = sampleUtilFiles()
    const report = buildReport(files, { lockedDirs: 1, roleDirs: 2 })
    const baseline = toBaseline(report)
    expect('rows' in baseline).toBe(false)
    expect(baseline.results.totalUtil).toBe(2)
    expect(baseline.summary).toBe('PASS')
  })
})
