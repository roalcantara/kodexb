#!/usr/bin/env bun
/**
 * mise run spec workflow status — six-column SDD pipeline progress.
 *
 * Reads the feature dir, derives a WorkflowProgressReport (pure, via @kb/exec),
 * enriches with catalog metadata, and dispatches to the chosen renderer
 * (pretty gum / raw / json / mermaid). `-o path.html` writes a self-contained
 * HTML export.
 *
 * Flags:
 *   --index        Show sectioned index (Proposal B) after grid
 *   --full         Show grid + index (same as --index when grid is visible)
 *   --refresh      Force re-derive (skip snapshot short-circuit)
 *   --record       Write durable snapshot to tools/metrics/workflow-status/<slug>/
 *   --list <slug>  List recorded snapshots
 *   --compare <a> <b>  Diff two snapshots
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  type CommitChunkProgress,
  deriveManifestNeedsHandoff,
  deriveWorkflowProgress,
  scanFeatureDir,
  slugFromDir,
  type WorkflowProgressReport,
  withUsage
} from '@kb/exec'
import { getLogger } from '@kb/shared/logging'
import { gumMuted } from '../../support/lib/cli/gum_theme.script'
import { chooseRenderer } from '../../support/lib/cli/render_mode.script'
import { readTextFileSync } from '../../support/lib/shared/text_file.script'
import { parseCommitPlanFromMarkdown } from './commit_plan_parse.script'
import { resolveAuditFeatureDir } from './resolve_active_feature_dir.script'
import { resolveCatalogKey } from './resolve_catalog_key.script'
import { renderWorkflowStatusHtml } from './workflow_status_html.script'
import { emitMermaid, type PrettyFlags, renderWorkflowStatus } from './workflow_status_output.script'
import {
  compareSnapshots,
  fingerprintMatches,
  listSnapshots,
  readLatestSnapshot,
  recordSnapshot
} from './workflow_status_snapshot.script'

const log = getLogger(['kb', 'ops', 'spec', 'workflow_status'])

type StatusArgs = {
  featureDir: string
  json: boolean
  raw: boolean
  format: 'pretty' | 'mermaid' | 'markdown'
  subgraph: boolean
  source: boolean
  output?: string
  index: boolean
  full: boolean
  refresh: boolean
  record: boolean
  listSlug?: string
  compare?: [string, string]
}

class ArgError extends Error {
  exitCode: number
  constructor(message: string, exitCode = 2) {
    super(message)
    this.exitCode = exitCode
  }
}

function parseArgs(argv: string[]): StatusArgs {
  const args: Partial<StatusArgs> = {
    featureDir: '',
    json: false,
    raw: false,
    format: 'pretty',
    subgraph: false,
    source: false,
    index: false,
    full: false,
    refresh: false,
    record: false
  }
  const positional: string[] = []
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (!a) continue
    if (a === '--source') {
      args.source = true
      continue
    }
    if (a === '--subgraph') {
      args.subgraph = true
      continue
    }
    if (a === '--json') {
      args.json = true
      continue
    }
    if (a === '--raw') {
      args.raw = true
      continue
    }
    if (a === '--index') {
      args.index = true
      continue
    }
    if (a === '--full') {
      args.full = true
      args.index = true
      continue
    }
    if (a === '--refresh') {
      args.refresh = true
      continue
    }
    if (a === '--record') {
      args.record = true
      continue
    }
    if (a === '--list') {
      const v = argv[++i]
      if (!v) throw new ArgError('--list requires a slug')
      args.listSlug = v
      continue
    }
    if (a === '--compare') {
      const aPath = argv[++i]
      const bPath = argv[++i]
      if (!aPath || !bPath) throw new ArgError('--compare requires two snapshot paths')
      args.compare = [aPath, bPath]
      continue
    }
    if (a === '--format') {
      const v = argv[++i]
      if (!v || !['pretty', 'mermaid', 'markdown'].includes(v)) {
        throw new ArgError('--format must be one of: pretty, mermaid, markdown')
      }
      args.format = v as StatusArgs['format']
      continue
    }
    if (a === '-o' || a === '--output') {
      const v = argv[++i]
      if (!v) throw new ArgError(`${a} requires a path`)
      args.output = v
      continue
    }
    if (a === '--help' || a === '-h') throw new ArgError(usageString(), 0)
    if (a.startsWith('-')) throw new ArgError(`unknown flag: ${a}`)
    positional.push(a)
  }
  args.featureDir = positional.join(' ') || ''
  if (args.json && args.raw) throw new ArgError('--json and --raw are mutually exclusive')
  if (args.subgraph && args.format !== 'mermaid') {
    throw new ArgError('--subgraph requires --format mermaid')
  }
  if (args.source && args.format !== 'mermaid') {
    throw new ArgError('--source requires --format mermaid')
  }
  return args as StatusArgs
}

function usageString(): string {
  return [
    'Usage: mise run spec workflow status [feature] [--json|--raw] [--format pretty|mermaid|markdown]',
    '       [--subgraph] [--source] [-o report.html] [--index] [--full] [--refresh]',
    '       [--record] [--list <slug>] [--compare <a> <b>]',
    '',
    'Shows six-column SDD pipeline progress, artifact debt, the NEXT command,',
    'and optional T### / Commit plan detail for the active feature.',
    '',
    'Flags:',
    '  --index     Show sectioned artifact index (Proposal B) after grid',
    '  --full      Show grid + sectioned index',
    '  --refresh   Force re-derive, skip snapshot short-circuit',
    '  --record    Write durable snapshot under tools/metrics/workflow-status/<slug>/',
    '  --list      List recorded snapshots for a slug',
    '  --compare   Diff two snapshot files'
  ].join('\n')
}

function readOptional(featureDir: string, file: string): string | undefined {
  const p = path.join(featureDir, file)
  return existsSync(p) ? readFileSync(p, 'utf-8') : undefined
}

function mapCommitChunks(tasksMd: string | undefined): CommitChunkProgress[] {
  if (!tasksMd) return []
  const parsed = parseCommitPlanFromMarkdown(tasksMd)
  if (!parsed.plan) return []
  return parsed.plan.chunks.map(c => ({
    id: c.id,
    subject: c.subject,
    paths: c.paths,
    taskIds: c.tasks.map(t => t.toUpperCase())
  }))
}

function main(): number {
  const ar = withUsage(() => parseArgs(process.argv.slice(2)), 'spec workflow status', usageString())
  if ('exitCode' in ar) return ar.exitCode
  const args = ar.value

  if (args.listSlug) {
    const out = listSnapshots(args.listSlug)
    for (const s of out) {
      console.log(`${s.path}  ${s.recordedAt}  ${s.phase}  ${s.tasksDone}/${s.tasksTotal}`)
    }
    return 0
  }

  if (args.compare) {
    const diff = compareSnapshots(args.compare[0], args.compare[1])
    console.log(diff)
    return 0
  }

  const resolved = resolveAuditFeatureDir(args.featureDir || undefined)
  if (!resolved.ok) {
    console.error(resolved.message)
    return resolved.exitCode
  }
  const featureDir = resolved.featureDir

  if (args.record) {
    return handleRecord(featureDir)
  }

  if (args.output) {
    const { report } = buildWorkflowReportWithShortCircuit(featureDir, args.refresh)
    const html = renderWorkflowStatusHtml(report)
    writeFileSync(args.output, html)
    console.log(gumMuted(`wrote ${args.output}`))
    return 0
  }

  if (args.format === 'mermaid') {
    const { report } = buildWorkflowReportWithShortCircuit(featureDir, args.refresh)
    const wantSource = args.source || !process.stdout.isTTY
    const out = emitMermaid(report, { subgraph: args.subgraph, source: wantSource })
    if (out.note) console.error(gumMuted(out.note))
    console.log(out.text)
    return 0
  }

  const mode = chooseRenderer({ json: args.json, raw: args.raw, isTty: process.stdout.isTTY })
  const flags: PrettyFlags = { showIndex: args.index || args.full, showGrid: !args.full || true }
  const { report } = buildWorkflowReportWithShortCircuit(featureDir, args.refresh)
  renderWorkflowStatus(report, mode, flags)
  return 0
}

function handleRecord(featureDir: string): number {
  const { report, slug } = buildWorkflowReport(featureDir)
  const result = recordSnapshot(report, slug)
  if (result.isErr()) {
    console.error(`snapshot write failed: ${result.error}`)
    return 1
  }
  console.log(gumMuted(`snapshot written: ${result.value}`))
  return 0
}

function buildWorkflowReportWithShortCircuit(
  featureDir: string,
  refresh: boolean
): { report: WorkflowProgressReport; slug: string } {
  if (!refresh) {
    const slug = slugFromDir(featureDir)
    if (fingerprintMatches(featureDir, slug)) {
      const cached = readLatestSnapshot(slug)
      if (cached) return { report: cached, slug }
      log.warn('fingerprint match but snapshot read failed — re-deriving')
    }
  }
  return buildWorkflowReport(featureDir)
}

/**
 * Resolve a feature dir → scan → derive → catalog enrich. Extracted from
 * `main()` so the full pipeline (including FS reads and catalog lookup) is
 * testable without `process.argv` / `process.exit`.
 */
export function buildWorkflowReport(featureDir: string): { report: WorkflowProgressReport; slug: string } {
  const files = scanFeatureDir(featureDir)
  const tasksMd = readOptional(featureDir, 'tasks.md')
  const handoffMd = readOptional(featureDir, 'handoff.md')
  const planMd = readOptional(featureDir, 'plan.md') ?? null
  const slug = slugFromDir(featureDir)

  const manifestNeedsHandoff = deriveManifestNeedsHandoff({ featureDir, slug, handoffMd, planMd })

  let catalogKey: string | null = null
  let catalogStatus: 'shipped' | 'in-progress' | null = null
  const keyResult = resolveCatalogKey(featureDir)
  if (keyResult.ok) {
    catalogKey = keyResult.key
    const status = readCatalogStatus(keyResult.key)
    if (status) catalogStatus = status
  } else if (keyResult.warning) {
    log.warn(keyResult.warning)
  }

  const commitChunks = mapCommitChunks(tasksMd)

  const report = deriveWorkflowProgress({
    featureDir,
    files,
    tasksMd,
    handoffMd,
    planMd,
    manifestNeedsHandoff,
    catalogKey,
    catalogStatus,
    commitChunks
  })

  return { report, slug }
}

function readCatalogStatus(key: string): 'shipped' | 'in-progress' | null {
  const catalogResult = readTextFileSync('assets/catalog/catalog.yaml')
  if (catalogResult.isErr()) return null
  try {
    const doc = Bun.YAML.parse(catalogResult.value) as Record<string, unknown>
    const entry = doc?.[key]
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const status = (entry as Record<string, unknown>).status
      if (status === 'shipped') return 'shipped'
      if (status === 'in-progress' || status === 'planned') return 'in-progress'
    }
  } catch {
    /* ignore — catalog lookup is best-effort */
  }
  return null
}

if (import.meta.main) process.exit(main())
