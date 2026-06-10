#!/usr/bin/env bun

const TASK_SEPARATOR = ':'
const COMPLEX_SCRIPT_PATTERN = /(&&|\|\||;|\||>|<|\bmkdir\b|\brm\b|\btee\b)/
const TABLE_TASK_PATTERN = /^\[tasks\."?([^"\]]+)"?\]/gm
const EXPECTED_PUBLIC_TASKS = [
  ['app', 'Manage Electrobun dev lifecycle and gates'],
  ['catalog', 'Shipped-feature registry (catalog.yaml metadata)'],
  ['ci', 'Run review, release, and publish CI workflows'],
  ['docker', 'Build, run, and test the Docker image'],
  ['graph', 'Install, configure, build, refresh, inspect, and watch the local CRG knowledge graph'],
  ['hooks', 'Run tests for Cursor agent hooks (.cursor/hooks/)'],
  ['lint', 'Run lint, strict lint, fix, report, and graph workflows'],
  ['perf', 'Run performance benchmark workflows (preview-server, workflow-observability)'],
  ['policy', 'Check Mise task policy and usage specs'],
  ['project', 'Manage setup, dependencies, cleanup, icons, repository, and local maintenance'],
  ['skill', 'Validate, generate, install, and report skill registry artifacts'],
  ['spec', 'kb SDD spec hub: lint, trace, gate, test, workflow, audit, scaffold'],
  ['test', 'Run unit, CI, e2e preview, spec audit, style checks, and catalog tag tests']
] as const
const EXPECTED_PACKAGE_SCRIPTS = [
  'start',
  'predev',
  'dev',
  'prebuild',
  'prebuild:prod',
  'dev:cef',
  'dev:verbose',
  'dev:debug',
  'dev:trace',
  'dev:kill',
  'build',
  'build:ci',
  'build:prod',
  'styles:compile',
  'build:insecure-local',
  'test',
  'typecheck',
  'lint',
  'lint:strict',
  'lint:fix',
  'lint:biome',
  'lint:biome:strict',
  'lint:biome:fix',
  'lint:biome:format',
  'lint:mise',
  'lint:knip',
  'lint:depcruise',
  'lint:jscpd',
  'lint:ls',
  'lint:hadolint',
  'lint:renderer-css',
  'lint:spec-guide',
  'lint:ast-grep',
  'lint:ast-grep:fix',
  'bdd:e2e:preview:install',
  'bdd:e2e:bddgen',
  'bdd:e2e',
  'bdd:e2e:ui',
  'bdd:e2e:smoke',
  'bdd:e2e:regression',
  'bdd:unit',
  'bdd:unit:dry-run',
  'bdd:e2e:metrics-report',
  'bdd:e2e:metrics-compare',
  'bdd:e2e:write-baseline',
  'bdd:e2e:preview',
  'bdd:e2e:preview:ui',
  'e2e:preview:install',
  'e2e:bddgen',
  'e2e',
  'e2e:ui',
  'e2e:smoke',
  'e2e:regression',
  'e2e:metrics-report',
  'e2e:metrics-compare',
  'e2e:write-baseline',
  'e2e:preview',
  'e2e:preview:ui'
] as const
const SPLIT_FAMILY_PREFIXES: string[] = []
const ACTION = process.env.usage_cmd ?? process.argv[2] ?? 'check'
const FORMAT = process.env.usage_format ?? 'text'
const STRICT = process.env.usage_strict === 'true'

type FindingSeverity = 'error' | 'warn' | 'info'
type Finding = { severity: FindingSeverity; code: string; target: string; message: string }
type TaskConfig = { description?: string; hide?: boolean; run?: string | string[]; usage?: string }
type UsageArg = { name?: string; choices?: { choices?: string[] } }
type UsageJson = { cmd?: { args?: UsageArg[]; flags?: Array<{ name?: string }> } }
type PolicyContext = { miseText: string; tasks: Record<string, TaskConfig>; scripts: Record<string, string> }

function die(msg: string, code = 1): never {
  console.error(msg)
  process.exit(code)
}

function chdirToGitRoot(): void {
  const r = Bun.spawnSync(['git', 'rev-parse', '--show-toplevel'])
  const root = r.stdout.toString().trim()
  if (!r.success || !root) die('policy: run from inside the app git checkout')
  process.chdir(root)
}

chdirToGitRoot()

if (ACTION !== 'check' && ACTION !== 'report') {
  die(`policy: unknown action ${ACTION} (use check|report)`, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function readContext(): Promise<PolicyContext> {
  const [miseText, packageConfig] = await Promise.all([
    Bun.file('mise.toml').text(),
    Bun.file('package.json').json() as Promise<{ scripts?: Record<string, string> }>
  ])
  const tasksRaw = (Bun.TOML.parse(miseText) as { tasks?: unknown }).tasks
  const tasks = isRecord(tasksRaw)
    ? Object.fromEntries(Object.entries(tasksRaw).filter((e): e is [string, TaskConfig] => isRecord(e[1])))
    : {}
  return { miseText, tasks, scripts: packageConfig.scripts ?? {} }
}

function runUsage(command: string[], spec: string): { ok: boolean; output: string } {
  const r = Bun.spawnSync(['usage', ...command], { stdin: new TextEncoder().encode(spec) })
  return {
    ok: r.success,
    output: `${r.stdout.toString()}${r.stderr.toString()}`.trim()
  }
}

function parseUsageJson(spec: string): UsageJson | undefined {
  const result = runUsage(['generate', 'json', '-f', '-'], spec)
  if (!result.ok) return
  return JSON.parse(result.output) as UsageJson
}

function checkOneUsageSpec(name: string, usage: string): Finding[] {
  const spec = `name ${JSON.stringify(name)}\n${usage}`
  const findings: Finding[] = []
  const lint = runUsage(['lint', '-W', '-'], spec)
  if (!lint.ok) findings.push({ severity: 'error', code: 'usage-lint', target: name, message: lint.output })
  const usageJson = parseUsageJson(spec)
  if (usageJson === undefined) {
    findings.push({ severity: 'error', code: 'usage-json', target: name, message: 'Usage JSON generation failed.' })
    return findings
  }
  return findings
}

function checkUsageSpecs(tasks: Record<string, TaskConfig>): Finding[] {
  return Object.entries(tasks).flatMap(([name, task]) =>
    typeof task.usage === 'string' ? checkOneUsageSpec(name, task.usage) : []
  )
}

function checkTableStyleTasks(miseText: string, tasks: Record<string, TaskConfig>): Finding[] {
  return [...miseText.matchAll(TABLE_TASK_PATTERN)].flatMap(match => {
    const name = match[1]
    if (!name) return []
    const task = tasks[name]
    if (!task || task.run || task.usage) return []
    return [
      {
        severity: 'warn' as const,
        code: 'table-task',
        target: name,
        message: 'Prefer an inline task object under [tasks].'
      }
    ]
  })
}

function checkDeprecatedTasks(tasks: Record<string, TaskConfig>): Finding[] {
  return Object.entries(tasks)
    .filter(([, task]) => task.description?.includes('DEPRECATED'))
    .map(([name]) => ({
      severity: 'warn' as const,
      code: 'deprecated-task',
      target: name,
      message: 'Remove deprecated task names before enforcing policy.'
    }))
}

function checkSplitFamilies(tasks: Record<string, TaskConfig>): Finding[] {
  const names = Object.keys(tasks)
  return SPLIT_FAMILY_PREFIXES.flatMap(prefix => {
    const members = names.filter(name => name.startsWith(`${prefix}${TASK_SEPARATOR}`))
    if (members.length === 0) return []
    return [
      {
        severity: 'info' as const,
        code: 'split-family',
        target: prefix,
        message: `Evaluate merging related tasks: ${members.sort().join(', ')}.`
      }
    ]
  })
}

function checkPackageScripts(scripts: Record<string, string>): Finding[] {
  const findings: Finding[] = []
  const actual = Object.keys(scripts)
  if (JSON.stringify(actual) !== JSON.stringify(EXPECTED_PACKAGE_SCRIPTS)) {
    findings.push({
      severity: 'error',
      code: 'package-script-surface',
      target: 'package.json',
      message: `Expected package scripts ${EXPECTED_PACKAGE_SCRIPTS.join(', ')}; got ${actual.join(', ')}.`
    })
  }
  findings.push(
    ...Object.entries(scripts)
      .filter(([, command]) => COMPLEX_SCRIPT_PATTERN.test(command) && !command.startsWith('mise run '))
      .map(([name, command]) => ({
        severity: 'info' as const,
        code: 'complex-package-script',
        target: name,
        message: `Evaluate moving this script behind Mise: ${command}`
      }))
  )
  return findings
}

function checkPublicTaskSurface(tasks: Record<string, TaskConfig>): Finding[] {
  const actual = Object.entries(tasks)
    .filter(([, task]) => task.hide !== true)
    .map(([name, task]) => [name, task.description ?? ''] as const)
    .sort(([a], [b]) => a.localeCompare(b))
  if (JSON.stringify(actual) === JSON.stringify(EXPECTED_PUBLIC_TASKS)) return []
  return [
    {
      severity: 'error' as const,
      code: 'public-task-surface',
      target: 'mise.toml',
      message: `Expected public tasks ${EXPECTED_PUBLIC_TASKS.map(([name]) => name).join(', ')}; got ${actual.map(([name]) => name).join(', ')}.`
    }
  ]
}

function checkMissingPackageScriptReferences(ctx: PolicyContext): Finding[] {
  const scriptNames = new Set(Object.keys(ctx.scripts))
  const refs = [...ctx.miseText.matchAll(/\bbun run ([A-Za-z0-9:_-]+)/g)]
    .map(match => match[1])
    .filter((name): name is string => name !== undefined)
  return [...new Set(refs)]
    .filter(name => !scriptNames.has(name))
    .map(name => ({
      severity: 'error' as const,
      code: 'missing-package-script-reference',
      target: name,
      message: `mise.toml references removed package script '${name}'.`
    }))
}

function checkUsageActionReferences(miseText: string): Finding[] {
  const legacyEnv = 'usage_action'
  const legacyPattern = new RegExp(`\\bprocess\\.env\\.${legacyEnv}\\b|\\$\\{${legacyEnv}\\b`)
  return legacyPattern.test(miseText)
    ? [
        {
          severity: 'error' as const,
          code: 'usage-action-reference',
          target: 'mise.toml',
          message: 'Use usage_cmd for task command dispatch.'
        }
      ]
    : []
}

async function collectFindings(): Promise<Finding[]> {
  const ctx = await readContext()
  return [
    ...checkUsageSpecs(ctx.tasks),
    ...checkPublicTaskSurface(ctx.tasks),
    ...checkTableStyleTasks(ctx.miseText, ctx.tasks),
    ...checkDeprecatedTasks(ctx.tasks),
    ...checkSplitFamilies(ctx.tasks),
    ...checkPackageScripts(ctx.scripts),
    ...checkMissingPackageScriptReferences(ctx),
    ...checkUsageActionReferences(ctx.miseText)
  ]
}

function printText(findings: Finding[]) {
  if (findings.length === 0) {
    console.log('policy check: no findings')
    return
  }
  console.log(`policy check: ${findings.length} finding(s)`)
  for (const f of findings) {
    console.log(`[${f.severity}] ${f.code} ${f.target}: ${f.message}`)
  }
}

async function main() {
  try {
    const findings = await collectFindings()
    if (FORMAT === 'json') {
      console.log(JSON.stringify({ findings }, null, 2))
    } else {
      printText(findings)
    }
    if (STRICT && findings.some(f => f.severity === 'error' || f.severity === 'warn')) {
      process.exit(1)
    }
  } catch (error) {
    die(error instanceof Error ? error.message : String(error), -1)
  }
}

await main()
