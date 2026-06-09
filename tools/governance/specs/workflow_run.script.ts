#!/usr/bin/env bun
/**
 * spec workflow — default run mode (TMF-8). Routes to orchestrated-handoff
 * with feature inference, allowlisted spawn, and NDJSON event recording.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { resolveActiveFeatureDir } from './resolve_active_feature_dir.script.ts'
import { detectPhase, scanFeatureDir } from './workflow/orchestrated_handoff.script.ts'
import {
  emitPhaseDecided,
  filesetFingerprint,
  generateRunId,
  slugFromFeatureDir,
  WorkflowRunWriter
} from './workflow/workflow_run.script.ts'

export { emitPhaseDecided, filesetFingerprint }

const ALLOWLIST_PREFIXES = ['mise run', 'hk check', 'bash tools/governance/specs/gate.sh']

export function parseWorkflowArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (!flag) continue
    if (!flag.startsWith('-')) {
      args.name = flag
      continue
    }
    switch (flag) {
      case '--feature':
        args.feature = argv[++i] ?? ''
        break
      case '--dry-run':
        args.dryRun = true
        break
      case '--next':
        args.dryRun = true
        args.deprecationWarned = true
        break
      case '--manifest':
        args.manifest = true
        break
      case '--lint':
        args.lint = true
        break
      case '--help':
      case '-h':
        args.help = true
        break
      default:
        if (!flag.startsWith('-')) break
        args.unknown = flag
    }
  }
  return args
}

function isAllowlisted(command: string): boolean {
  return ALLOWLIST_PREFIXES.some(p => command.startsWith(p))
}

function spawnCommand(command: string): number {
  const parts = command.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 0
  const c = Bun.spawnSync(parts, { stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' })
  return c.exitCode ?? 1
}

function run(): void {
  const argv = process.argv.slice(2)
  const args = parseWorkflowArgs(argv)

  if (args.help) {
    console.log(
      [
        'Usage: spec workflow [name] [options]',
        '',
        'Options:',
        '  --feature <dir>    Feature directory (inferred if omitted)',
        '  --dry-run          Print next step without running (default when not allowlisted)',
        '  --manifest         Print XML subtask manifest (backward compat)',
        '  --lint             Run spec lint (backward compat)',
        '  --next             Alias for --dry-run (deprecated)',
        '  --help             Show this help'
      ].join('\n')
    )
    process.exit(0)
  }

  if (args.unknown) {
    console.error(`spec workflow: unknown flag "${args.unknown}"`)
    process.exit(2)
  }

  if (args.deprecationWarned) {
    console.error('spec workflow: --next is deprecated; use --dry-run instead')
  }

  const name = (args.name as string) || 'orchestrated-handoff'

  if (name !== 'orchestrated-handoff') {
    console.error(`spec workflow: unknown workflow "${name}". Allowed: orchestrated-handoff`)
    process.exit(2)
  }

  let featureDir = args.feature as string | undefined
  if (!featureDir) {
    const resolved = resolveActiveFeatureDir()
    if (!resolved.ok) {
      console.error(resolved.message)
      process.exit(resolved.exitCode)
    }
    featureDir = resolved.featureDir
  }

  if (!existsSync(path.join(featureDir, 'spec.md'))) {
    console.error(`spec workflow: no spec.md found in ${featureDir}`)
    process.exit(2)
  }

  if (args.lint) {
    const r = Bun.spawnSync(['bun', 'tools/governance/specs/lint.script.ts', '--strict', featureDir], {
      stdout: 'inherit',
      stderr: 'inherit'
    })
    process.exit(r.exitCode ?? 1)
  }

  if (args.manifest) {
    const handoffPath = path.join(featureDir, 'handoff.md')
    if (!existsSync(handoffPath)) {
      console.error(`spec workflow: --manifest requires ${handoffPath}`)
      process.exit(1)
    }
    const slug = slugFromFeatureDir(featureDir)
    const handoffMd = readFileSync(handoffPath, 'utf-8')
    const planMd = existsSync(path.join(featureDir, 'plan.md'))
      ? readFileSync(path.join(featureDir, 'plan.md'), 'utf-8')
      : null
    const subtasks = buildSubtaskManifest({ featureDir: featureDir, slug, handoffMd, planMd })
    process.stdout.write(renderManifestXml(subtasks))
    process.exit(0)
  }

  const writer = new WorkflowRunWriter(generateRunId(slugFromFeatureDir(featureDir)), featureDir)
  const files = scanFeatureDir(featureDir)
  const probe = () => {
    const handoffPath = path.join(featureDir, 'handoff.md')
    if (!existsSync(handoffPath)) return true
    const hmd = readFileSync(handoffPath, 'utf-8')
    const pmd = existsSync(path.join(featureDir, 'plan.md'))
      ? readFileSync(path.join(featureDir, 'plan.md'), 'utf-8')
      : null
    const subSlug = slugFromFeatureDir(featureDir)
    return buildSubtaskManifest({ featureDir, slug: subSlug, handoffMd: hmd, planMd: pmd }).some(
      s => s.type === 'gherkin-bdd-handoff'
    )
  }

  const next = detectPhase(files, featureDir, probe)
  const t0 = performance.now()
  emitPhaseDecided(writer, featureDir, t0, files, probe, next)

  if (args.dryRun) {
    if (next.focusHint) {
      console.log(`${next.command}    # ${next.focusHint}`)
    } else {
      console.log(next.command)
    }
    process.exit(0)
  }

  if (isAllowlisted(next.command)) {
    const exitCode = spawnCommand(next.command)
    process.exit(exitCode)
  }

  console.log(next.command)
  process.exit(0)
}

function buildSubtaskManifest(_input: {
  featureDir: string
  slug: string
  handoffMd: string
  planMd: string | null
}): { type: string; description: string }[] {
  const subtasks: { type: string; description: string }[] = [
    {
      type: 'implement-src',
      description: 'Primary agent runs speckit.implement under src/ with co-located *.spec.ts files.'
    }
  ]
  return subtasks
}

function renderManifestXml(subtasks: { type: string; description: string }[]): string {
  const inner = subtasks
    .map(
      s =>
        `  <task>\n    <type>${s.type}</type>\n    <description>${s.description.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</description>\n  </task>`
    )
    .join('\n')
  return `<tasks>\n${inner}\n</tasks>\n`
}

if (import.meta.main) run()
