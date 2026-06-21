import path from 'node:path'
import { classifyUtil, computeMetrics, type RoleMetrics, type UtilRow } from './role_conformance_core.script'

const ROOT = path.resolve(import.meta.dir, '../../../../../..')
const BASELINE_PATH = path.join(ROOT, 'tools/metrics/baselines/role-conformance/baseline.json')

export type RoleReport = {
  timestamp: string
  git_sha: string
  bun_version: string
  results: RoleMetrics
  rows: UtilRow[]
  violations: Array<{ metric: string; value: number; baseline: number }>
  summary: 'PASS' | 'FAIL'
}

export function buildReport(
  files: Array<{ path: string; source: string }>,
  dirs: { lockedDirs: number; roleDirs: number },
  baseline?: RoleMetrics
): RoleReport {
  const rows = files.map(f => classifyUtil(f.path, f.source))
  const results = computeMetrics(rows, { locked: dirs.lockedDirs, roleDirs: dirs.roleDirs })
  const violations: RoleReport['violations'] = []
  if (baseline) {
    if (results.mislabeledUtilCount > baseline.mislabeledUtilCount)
      violations.push({
        metric: 'mislabeledUtilCount',
        value: results.mislabeledUtilCount,
        baseline: baseline.mislabeledUtilCount
      })
    if (results.utilPurityRatio < baseline.utilPurityRatio)
      violations.push({ metric: 'utilPurityRatio', value: results.utilPurityRatio, baseline: baseline.utilPurityRatio })
  }
  return {
    timestamp: new Date().toISOString(),
    git_sha: process.env.GIT_SHA ?? 'unknown',
    bun_version: Bun.version,
    results,
    rows,
    violations,
    summary: violations.length === 0 ? 'PASS' : 'FAIL'
  }
}

export function deriveDirCoverage(files: Array<{ path: string; source: string }>): {
  lockedDirs: number
  roleDirs: number
} {
  const roleDirs = new Set(files.map(f => path.dirname(f.path)).filter(d => /\/[a-z][a-z0-9_]*$/.test(d)))
  return { lockedDirs: 0, roleDirs: roleDirs.size }
}

export function renderReportMd(report: RoleReport): string {
  const rows = report.rows
    .map(r => `| ${r.path} | ${r.importsIO} | ${r.verdict} | ${r.suggestedSuffix ?? '-'} |`)
    .join('\n')
  return [
    '# Role-Conformance Report',
    '',
    `**Summary:** ${report.summary}`,
    `**Timestamp:** ${report.timestamp}`,
    `**Git SHA:** ${report.git_sha}`,
    `**Bun:** ${report.bun_version}`,
    '',
    '## Metrics',
    '| Metric | Value |',
    '|--------|-------|',
    `| totalUtil | ${report.results.totalUtil} |`,
    `| mislabeledUtilCount | ${report.results.mislabeledUtilCount} |`,
    `| utilPurityRatio | ${report.results.utilPurityRatio} |`,
    `| enforcedDirRatio | ${report.results.enforcedDirRatio} |`,
    `| suffixViolations | ${report.results.suffixViolations} |`,
    '',
    ...(report.violations.length > 0
      ? [
          '## Violations',
          '| Metric | Value | Baseline |',
          '|--------|-------|----------|',
          ...report.violations.map(v => `| ${v.metric} | ${v.value} | ${v.baseline} |`)
        ]
      : []),
    '',
    '## File Classification',
    '| Path | Imports IO | Verdict | Suggested Suffix |',
    '|------|------------|---------|------------------|',
    rows,
    ''
  ].join('\n')
}

export type RoleBaseline = Omit<RoleReport, 'rows'>

export function toBaseline(report: RoleReport): RoleBaseline {
  const { rows: _rows, ...rest } = report
  return rest
}

async function scanUtilFiles(): Promise<Array<{ path: string; source: string }>> {
  const glob = new Bun.Glob('src/**/*.util.ts')
  const out: Array<{ path: string; source: string }> = []
  for await (const rel of glob.scan({ cwd: ROOT })) {
    if (rel.endsWith('.spec.ts')) continue
    out.push({ path: rel, source: await Bun.file(path.join(ROOT, rel)).text() })
  }
  return out
}

async function loadBaseline(): Promise<RoleMetrics | undefined> {
  const f = Bun.file(BASELINE_PATH)
  return (await f.exists()) ? (JSON.parse(await f.text()).results as RoleMetrics) : undefined
}

async function deriveDirCoverageFromFiles(): Promise<{ lockedDirs: number; roleDirs: number }> {
  const files = await scanUtilFiles()
  return deriveDirCoverage(files)
}

if (import.meta.main) {
  const rawAction = process.env.usage_cmd ?? process.argv[2] ?? 'compare'
  const action = rawAction.includes(' ') ? (rawAction.split(' ').at(-1) ?? rawAction) : rawAction
  const files = await scanUtilFiles()
  const dirs = await deriveDirCoverageFromFiles()
  const baseline = action === 'baseline' ? undefined : await loadBaseline()
  const report = buildReport(files, dirs, baseline)

  const runDir = path.join(ROOT, 'tmp/metrics/role-conformance')
  await Bun.write(path.join(runDir, 'latest.json'), JSON.stringify(report, null, 2))
  await Bun.write(path.join(runDir, 'report.md'), renderReportMd(report))

  if (action === 'baseline' || process.env.usage_write_baseline === 'true') {
    await Bun.write(BASELINE_PATH, JSON.stringify(toBaseline(report), null, 2))
  }
  console.log(
    `${report.summary} mislabeled=${report.results.mislabeledUtilCount} purity=${report.results.utilPurityRatio}`
  )
  if (report.summary === 'FAIL') process.exitCode = 1
}
