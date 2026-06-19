#!/usr/bin/env bun
/**
 * mise run test — unit, CI, e2e, spec audit/style, catalog tag discovery/run.
 */
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import {
  acTagFromSliceId,
  formatTagListJson,
  formatTagListText,
  isAcSliceId,
  layerFilter,
  resolveAllCatalogTags,
  resolveTagKey,
  runTaggedTests
} from '../governance/registries/catalog/tag.script'
import { chdirToRepoRoot } from '../support/lib/shared/repo_root.script'
import { runInherit, spawnInherit } from '../support/lib/shared/spawn_inherit.script'

const KNOWN_ACTIONS = new Set(['unit', 'ci', 'spec-audit', 'spec-style', 'e2e-preview', 'e2e', 'tag'])

function envBool(name: string): boolean {
  return process.env[name] === 'true'
}

function die(msg: string, code = 1): never {
  console.error(msg)
  process.exit(code)
}

function parseTagCli(): {
  list: boolean
  e2e: boolean
  unit: boolean
  json: boolean
  catalogKeys: string[]
  acTag?: string
} {
  let list = envBool('usage_list')
  let e2e = envBool('usage_e2e')
  let unit = envBool('usage_unit')
  const json = envBool('usage_json')
  const catalogKeys: string[] = []
  let acTag: string | undefined
  const usageKey = process.env.usage_key?.trim()
  if (usageKey) {
    if (isAcSliceId(usageKey)) acTag = acTagFromSliceId(usageKey) ?? undefined
    else catalogKeys.push(usageKey)
  }
  const usageSlice = process.env.usage_slice?.trim()
  if (usageSlice && isAcSliceId(usageSlice)) {
    acTag = acTagFromSliceId(usageSlice) ?? undefined
  }

  for (const arg of process.argv.slice(2)) {
    if (arg === 'tag') continue
    if (KNOWN_ACTIONS.has(arg)) continue
    switch (arg as string) {
      case '--list':
        list = true
        break
      case '--e2e':
        e2e = true
        break
      case '--unit':
        unit = true
        break
      case '--json':
        break
      default:
        if (!arg.startsWith('--')) {
          if (isAcSliceId(arg)) acTag = acTagFromSliceId(arg) ?? undefined
          else catalogKeys.push(arg)
        }
    }
  }

  return { list, e2e, unit, json, catalogKeys, acTag }
}

async function runTagSubcommand(root: string): Promise<void> {
  const { list, e2e, unit, json, catalogKeys, acTag } = parseTagCli()
  const filter = layerFilter(e2e, unit)

  if (list) {
    const resolutions =
      catalogKeys.length === 0
        ? await resolveAllCatalogTags()
        : await Promise.all(catalogKeys.map(k => resolveTagKey(k)))
    const filtered = resolutions.map(r => ({
      ...r,
      features: filter.e2e ? r.features : [],
      units: filter.unit ? r.units : []
    }))
    if (json) {
      console.log(JSON.stringify(formatTagListJson(filtered, filter), null, 2))
      return
    }
    console.log(formatTagListText(filtered, filter))
    if (acTag) console.log(`\nAC slice: ${acTag}`)
    return
  }

  if (catalogKeys.length === 0 && !acTag) {
    die('test tag: specify at least one catalog key or an AC tag to run, or use --list', 2)
  }

  const resolutions = await Promise.all(catalogKeys.map(k => resolveTagKey(k)))
  if (!json) {
    for (const res of resolutions) {
      console.log(formatTagListText([res], { e2e: true, unit: true }))
      console.log('')
    }
    if (acTag) console.log(`AC slice: ${acTag}\n`)
  }
  runTaggedTests(resolutions, filter, root, acTag)
}

function runSpecAudit(root: string, strict: boolean): void {
  const SRC = path.join(root, 'src')
  const EXEMPT_SUFFIXES = ['.d.ts', '.types.ts', '.const.ts', '.guard.ts']
  const EXEMPT_FILES = ['index.ts', 'main.ts', 'registry.ts', 'generated.ts']
  const TS_EXT_RE = /\.tsx?$/
  const SOURCE_GLOB = new Bun.Glob('**/*.{ts,tsx}')

  function hasSpec(filePath: string): boolean {
    const stem = filePath.replace(TS_EXT_RE, '')
    return existsSync(`${stem}.spec.ts`) || existsSync(`${stem}.spec.tsx`)
  }

  function isExempt(rel: string): boolean {
    if (!rel.startsWith('src/')) return true
    if (EXEMPT_SUFFIXES.some(suffix => rel.endsWith(suffix))) return true
    const base = rel.split('/').pop() ?? ''
    if (EXEMPT_FILES.some(f => base === f || base.endsWith(`.${f}`))) return true
    if (base.endsWith('.schema.ts') || base.endsWith('.schemas.ts')) return true
    if (base === 'index.ts' || base === 'shared.ts') return true
    return rel.includes('__tests__/fixtures') || rel.includes('generated')
  }

  const missing = [...SOURCE_GLOB.scanSync(SRC)]
    .flatMap(name => {
      const full = path.join(SRC, name)
      const rel = path.relative(root, full).replace(/\\/g, '/')
      if (isExempt(rel) || hasSpec(full)) return []
      return [rel]
    })
    .sort()

  for (const m of missing) console.log(m)
  if (missing.length > 0) {
    console.error('missing specs:', missing.length)
    if (strict) process.exit(1)
  }
}

async function runSpecStyle(root: string, strict: boolean, styleFormat: string): Promise<void> {
  const SRC = path.join(root, 'src')
  const TRAILING_SLASH_RE = /\/$/
  const SPEC_GLOB = new Bun.Glob('**/*.spec.{ts,tsx}')
  const SCOPE_ALIASES: Record<string, string> = {
    'test-helper': 'src/__tests__',
    core: 'src/core',
    shared: 'src/shared',
    'shell-app': 'src/shell/app',
    'shell-main': 'src/shell/main',
    'shell-renderer': 'src/shell/renderer'
  }

  type StyleIssue = { file: string; category: string; message: string }

  function normalizeScope(raw: string): string {
    const value = SCOPE_ALIASES[raw] || raw || 'src'
    const scoped = value.startsWith('src') ? value : `src/${value}`
    return path.normalize(scoped).replace(/\\/g, '/').replace(TRAILING_SLASH_RE, '')
  }

  const scope = normalizeScope(process.env.usage_scope || 'src')
  const relPath = (full: string) => path.relative(root, full).replace(/\\/g, '/')
  const inScope = (rel: string) => rel === scope || rel.startsWith(`${scope}/`)

  async function loadFactoryNames(): Promise<Set<string>> {
    const file = Bun.file(path.join(root, 'src/__tests__/factories/factories.builder.ts'))
    if (!(await file.exists())) return new Set()
    const c = await file.text()
    const start = c.indexOf('const factories = {')
    const end = c.indexOf('} as const', start)
    if (start < 0 || end < start) return new Set()
    return new Set(
      [...c.slice(start, end).matchAll(/(?:'([^']+)'|(\w+))\s*:/g)]
        .map(x => x[1] ?? x[2])
        .filter((name): name is string => name !== undefined)
    )
  }

  function auditSpec(rel: string, c: string, knownFactories: Set<string>): StyleIssue[] {
    const findings: StyleIssue[] = []
    const add = (category: string, message: string) => findings.push({ file: rel, category, message })

    if (/import\s*\{[^}]*\btest\b/.test(c)) add('test usage', 'imports test from bun:test (use it)')
    if (/^\s*test\(/m.test(c)) add('test usage', 'uses test() (use it)')
    if (!c.includes('describe(')) add('no describe', 'no describe block')
    if (c.includes('describe(') && !/describe\(['"]when |describe\(['"]with |describe\(['"]without /.test(c)) {
      add('no situation', 'no when/with/without situation describe')
    }
    for (const l of c.split('\n')) {
      const m = l.match(/^\s*it\('(.{41,})'\)/)
      if (m) {
        add('long description', `${m[1]?.slice(0, 60) ?? ''}: description > 40 chars`)
        break
      }
    }
    if (/expect\([^)]*===/.test(c) && /\.toBe\(true\)|\.toBe\(false\)/.test(c)) {
      add('opaque boolean matcher', 'opaque boolean matcher (use readable matcher)')
    }
    if (/window\.dispatchEvent/.test(c) || /document\.dispatchEvent/.test(c)) {
      add('global dispatchEvent', 'uses global dispatchEvent')
    }
    if (/\bmock\s*\(/.test(c) || /\bspyOn\s*\(/.test(c) || /\bmock\.module\s*\(/.test(c)) {
      add('mock usage', 'uses mock, spyOn, or mock.module')
    }
    for (const [, name] of c.matchAll(/factoryFor\('([^']+)'/g)) {
      if (name && !knownFactories.has(name)) {
        add('unknown factory', `factoryFor('${name}') not in factories.builder.ts`)
      }
    }
    return findings
  }

  function categoryCounts(findings: StyleIssue[]): [string, number][] {
    const counts = new Map<string, number>()
    for (const { category } of findings) counts.set(category, (counts.get(category) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }

  function render(specCount: number, findings: StyleIssue[], asMarkdown: boolean): string {
    const counts = categoryCounts(findings)
    if (!asMarkdown) {
      const lines = [`scope: ${scope}`, `specs scanned: ${specCount}`]
      for (const [category, count] of counts) lines.push(`${category}: ${count}`)
      for (const issue of findings) lines.push(`${issue.file}: ${issue.message}`)
      lines.push(`style issues: ${findings.length}`)
      return lines.join('\n')
    }
    const lines = [
      '### Better Specs style audit',
      '',
      `- Scope: \`${scope}\``,
      `- Specs scanned: ${specCount}`,
      `- Style issues: ${findings.length}`,
      '',
      '| Category | Count |',
      '| --- | ---: |',
      ...(counts.length === 0 ? ['| none | 0 |'] : counts.map(([c, n]) => `| ${c} | ${n} |`)),
      ''
    ]
    if (findings.length > 0) {
      lines.push('<details>', '<summary>Findings</summary>', '')
      for (const issue of findings) lines.push(`- \`${issue.file}\` — ${issue.message}`)
      lines.push('', '</details>')
    }
    return lines.join('\n')
  }

  const specPaths = [...SPEC_GLOB.scanSync(SRC)]
    .map(name => path.join(SRC, name))
    .filter(full => inScope(relPath(full)))
    .sort()

  const factoryNames = await loadFactoryNames()
  const specTexts = await Promise.all(specPaths.map(full => Bun.file(full).text()))
  const issues = specPaths.flatMap((full, index) => auditSpec(relPath(full), specTexts[index] ?? '', factoryNames))

  const markdown = render(specPaths.length, issues, true)
  const report = styleFormat === 'markdown' ? markdown : render(specPaths.length, issues, false)
  console.log(report)
  if (issues.length > 0 && strict) process.exit(1)
}

const METRICS_SCRIPT = 'packages/ops/src/metrics/harnesses/e2e-quality/e2e_metrics.script.ts'

function applyE2eCiEnv(ci: boolean): void {
  if (!ci) return
  process.env.CI = 'true'
  process.env.NODE_ENV = 'test'
}

function runE2e(root: string): void {
  const ci = envBool('usage_ci')
  const smoke = envBool('usage_smoke')
  const regression = envBool('usage_regression')
  const debug = envBool('usage_debug')
  const metricsReport = envBool('usage_metrics_report') || envBool('usage_metrics-report')
  const metricsCompare = envBool('usage_metrics_compare') || envBool('usage_metrics-compare')
  const writeBaseline = envBool('usage_write_baseline') || envBool('usage_write-baseline')

  if (smoke && regression) {
    die('test e2e: --smoke and --regression are mutually exclusive', 2)
  }

  applyE2eCiEnv(ci)

  if (writeBaseline) {
    spawnInherit(['bun', METRICS_SCRIPT, 'write-baseline'], root)
  }

  const runSuite = smoke || regression || debug || (!metricsReport && !metricsCompare && !writeBaseline)

  if (runSuite) {
    const suiteCmd = smoke
      ? ['bun', 'run', 'e2e:smoke']
      : regression
        ? ['bun', 'run', 'e2e:regression']
        : debug
          ? ['bun', 'run', 'e2e:bddgen']
          : ['bun', 'run', 'e2e']
    const suiteCode = runInherit(suiteCmd, root)
    if (suiteCode !== 0) process.exit(suiteCode)
  }

  if (metricsReport) {
    const reportCode = runInherit(['bun', METRICS_SCRIPT, 'report'], root)
    if (reportCode !== 0) process.exit(reportCode)
  }

  if (metricsCompare) {
    spawnInherit(['bun', METRICS_SCRIPT, 'compare'], root)
  }

  if (!runSuite && !metricsReport && !metricsCompare && !writeBaseline) {
    die('test e2e: pass --smoke, --regression, --metrics-report, or another e2e flag', 2)
  }
}

async function main(): Promise<void> {
  const ROOT = chdirToRepoRoot()
  const ACTION = process.env.usage_cmd ?? 'unit'
  const STRICT = envBool('usage_strict')
  const STYLE_FORMAT = process.env.usage_format ?? 'text'

  if (ACTION === 'unit') {
    spawnInherit(['bun', 'test', '--pass-with-no-tests'], ROOT)
  } else if (ACTION === 'ci') {
    mkdirSync(path.join(ROOT, 'tmp/reports/tests'), { recursive: true })
    spawnInherit(
      [
        'bun',
        'test',
        '--pass-with-no-tests',
        '--reporter=junit',
        '--reporter-outfile=tmp/reports/tests/junit.xml',
        '--coverage',
        '--coverage-dir=tmp/reports/tests/coverage'
      ],
      ROOT
    )
  } else if (ACTION === 'spec-audit') {
    runSpecAudit(ROOT, STRICT)
  } else if (ACTION === 'spec-style') {
    await runSpecStyle(ROOT, STRICT, STYLE_FORMAT)
  } else if (ACTION === 'e2e-preview') {
    spawnInherit(['bun', 'run', 'e2e:preview'], ROOT)
  } else if (ACTION === 'e2e') {
    runE2e(ROOT)
  } else if (ACTION === 'tag') {
    await runTagSubcommand(ROOT)
  } else {
    die(`test: unknown action ${ACTION}`, 2)
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
