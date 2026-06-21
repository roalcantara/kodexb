import fs from 'node:fs'
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
  baseline?: RoleMetrics,
  gitSha: string = process.env.GIT_SHA ?? 'unknown'
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
    if (results.enforcedDirRatio < baseline.enforcedDirRatio)
      violations.push({
        metric: 'enforcedDirRatio',
        value: results.enforcedDirRatio,
        baseline: baseline.enforcedDirRatio
      })
  }
  return {
    timestamp: new Date().toISOString(),
    git_sha: gitSha,
    bun_version: Bun.version,
    results,
    rows,
    violations,
    summary: violations.length === 0 ? 'PASS' : 'FAIL'
  }
}

/** ls-lint enforcement coverage: how many real `src/` dirs carry an `.ls-lint.yml` rule. */
export function deriveDirCoverage(
  srcDirs: ReadonlySet<string>,
  lockedDirs: ReadonlySet<string>
): { lockedDirs: number; roleDirs: number } {
  let locked = 0
  for (const dir of srcDirs) if (lockedDirs.has(dir)) locked++
  return { lockedDirs: locked, roleDirs: srcDirs.size }
}

/** Directories explicitly pinned by an `.ls-lint.yml` `ls:` rule (src/ scope only). */
export function parseLockedDirs(lsLintYaml: string): Set<string> {
  const parsed = Bun.YAML.parse(lsLintYaml) as { ls?: Record<string, unknown> } | null
  const keys = parsed && typeof parsed === 'object' && parsed.ls ? Object.keys(parsed.ls) : []
  return new Set(keys.filter(k => k.startsWith('src/')))
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

async function scanSrcDirs(): Promise<Set<string>> {
  const glob = new Bun.Glob('src/**/*.{ts,tsx}')
  const dirs = new Set<string>()
  for await (const rel of glob.scan({ cwd: ROOT })) {
    if (rel.endsWith('.spec.ts') || rel.endsWith('.spec.tsx')) continue
    dirs.add(path.dirname(rel))
  }
  return dirs
}

async function deriveDirCoverageFromFiles(): Promise<{ lockedDirs: number; roleDirs: number }> {
  const srcDirs = await scanSrcDirs()
  const lsLint = await Bun.file(path.join(ROOT, '.ls-lint.yml')).text()
  return deriveDirCoverage(srcDirs, parseLockedDirs(lsLint))
}

function deriveGitSha(): string {
  if (process.env.GIT_SHA) return process.env.GIT_SHA
  try {
    const sha = Bun.spawnSync(['git', 'rev-parse', '--short', 'HEAD'], { cwd: ROOT }).stdout.toString().trim()
    return sha.length > 0 ? sha : 'unknown'
  } catch {
    return 'unknown'
  }
}

if (import.meta.main) {
  const rawAction = process.env.usage_cmd ?? process.argv[2] ?? 'compare'
  const action = rawAction.includes(' ') ? (rawAction.split(' ').at(-1) ?? rawAction) : rawAction
  const files = await scanUtilFiles()
  const dirs = await deriveDirCoverageFromFiles()
  const baseline = action === 'baseline' ? undefined : await loadBaseline()
  const report = buildReport(files, dirs, baseline, deriveGitSha())

  const runDir = path.join(ROOT, 'tmp/metrics/role-conformance')
  fs.mkdirSync(runDir, { recursive: true })
  await Bun.write(path.join(runDir, 'latest.json'), JSON.stringify(report, null, 2))
  await Bun.write(path.join(runDir, 'report.md'), renderReportMd(report))

  if (action === 'baseline' || process.env.usage_write_baseline === 'true') {
    await Bun.write(BASELINE_PATH, `${JSON.stringify(toBaseline(report), null, 2)}\n`)
  }
  console.log(
    `${report.summary} mislabeled=${report.results.mislabeledUtilCount} purity=${report.results.utilPurityRatio}`
  )
  if (report.summary === 'FAIL') process.exitCode = 1
}
