#!/usr/bin/env bun
/**
 * mise run spec workflow status — six-column SDD pipeline progress.
 *
 * Reads the feature dir, derives a WorkflowProgressReport (pure, via @kb/exec),
 * enriches with catalog metadata, and dispatches to the chosen renderer
 * (pretty gum / raw / json / mermaid). `-o path.html` writes a self-contained
 * HTML export.
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
import { renderMermaid, renderWorkflowStatus } from './workflow_status_output.script'

const log = getLogger(['kb', 'ops', 'spec', 'workflow_status'])

type StatusArgs = {
  featureDir: string
  json: boolean
  raw: boolean
  format: 'pretty' | 'mermaid' | 'markdown'
  output?: string
}

class ArgError extends Error {
  exitCode: number
  constructor(message: string, exitCode = 2) {
    super(message)
    this.exitCode = exitCode
  }
}

function parseArgs(argv: string[]): StatusArgs {
  const args: Partial<StatusArgs> = { featureDir: '', json: false, raw: false, format: 'pretty' }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (!a) continue
    if (a === '--json') {
      args.json = true
      continue
    }
    if (a === '--raw') {
      args.raw = true
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
    if (!args.featureDir) {
      args.featureDir = a
      continue
    }
    throw new ArgError(`unexpected argument: ${a}`)
  }
  if (args.json && args.raw) throw new ArgError('--json and --raw are mutually exclusive')
  return args as StatusArgs
}

function usageString(): string {
  return [
    'Usage: mise run spec workflow status [feature] [--json|--raw] [--format pretty|mermaid|markdown] [-o report.html]',
    '',
    'Shows six-column SDD pipeline progress, artifact debt, the NEXT command,',
    'and optional T### / Commit plan detail for the active feature.'
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
  return parsed.plan.chunks.map(c => ({ id: c.id, subject: c.subject, paths: c.paths }))
}

function main(): number {
  const ar = withUsage(() => parseArgs(process.argv.slice(2)), 'spec workflow status', usageString())
  if ('exitCode' in ar) return ar.exitCode
  const args = ar.value

  const resolved = resolveAuditFeatureDir(args.featureDir || undefined)
  if (!resolved.ok) {
    console.error(resolved.message)
    return resolved.exitCode
  }

  const report = buildWorkflowReport(resolved.featureDir)

  if (args.output) {
    const html = renderWorkflowStatusHtml(report)
    writeFileSync(args.output, html)
    console.log(gumMuted(`wrote ${args.output}`))
    return 0
  }

  if (args.format === 'mermaid') {
    console.log(renderMermaid(report))
    return 0
  }

  const mode = chooseRenderer({ json: args.json, raw: args.raw, isTty: process.stdout.isTTY })
  renderWorkflowStatus(report, mode)
  return 0
}

/**
 * Resolve a feature dir → scan → derive → catalog enrich. Extracted from
 * `main()` so the full pipeline (including FS reads and catalog lookup) is
 * testable without `process.argv` / `process.exit`.
 */
export function buildWorkflowReport(featureDir: string): WorkflowProgressReport {
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

  return deriveWorkflowProgress({
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
