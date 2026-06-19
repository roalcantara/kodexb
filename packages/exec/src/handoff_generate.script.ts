#!/usr/bin/env bun
/**
 * spec handoff-generate — emit tmp/handoffs/opencode-{slug}-{focus}.md
 * from a feature's handoff.md AC table. See assets/guides/SDD_WORKFLOW_GUIDE.md.
 *
 * Opencode integration per https://opencode.ai/docs/cli/ — non-interactive
 * entry is `opencode run [message..]`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { sliceIdFromAcTag } from './handoff_ac_tag.util'
import { scrubPrompt } from './handoff_scrub.util'
import { UsageError, withUsage } from './usage.script'
import { generateRunId, WorkflowRunWriter } from './workflow_run.script'

const FOCUS_VALUES = ['gherkin', 'catalog', 'e2e-fix'] as const
const WORKER_VALUES = ['opencode'] as const

export type Focus = (typeof FOCUS_VALUES)[number]
export type Worker = (typeof WORKER_VALUES)[number]

export type AcRow = {
  id: string
  doneWhen: string
  evidence: string
  acTag: string | null
  sliceId: string | null
  isOperatorSmoke: boolean
}

export type HandoffInput = {
  featureDir: string
  slug: string
  catalogKey: string
  focus: Focus
  worker: Worker
  acRows: AcRow[]
  fileTouchList: string[]
  planMd: string | null
}

export type DispatchResult = {
  writtenPath: string
  dispatched: boolean
  exitCode: number
  bodyBytes: number
}

const BYTES_PER_KILOBYTE = 1024
const ARGV_THRESHOLD_KILOBYTES = 64
const ARGV_SAFE_THRESHOLD = ARGV_THRESHOLD_KILOBYTES * BYTES_PER_KILOBYTE
const OPERATOR_SMOKE_PATTERNS = [/operator/i, /manual/i, /smoke/i, /browser/i, /quickstart/i]
const EVIDENCE_TEST_PATTERNS = [/`?bun test\b/i, /mise run test tag\b/i]

const RE_AC_TABLE_HEADER = /^\|\s*ID\s*\|\s*Done when\s*\|\s*Evidence\s*\|/i
const RE_TABLE_SEPARATOR = /^\|\s*[-: ]+\s*\|/
const RE_AC_TAG = /^([A-Z]+)-(\d+)\s+AC(\d+)$/i
const RE_FILE_TOUCH_HEADING = /^#{2,4}\s+File touch list\b/i
const RE_BULLET_FILENAME = /^\s*[-*]\s+`?([^`\s]+)`?/
const RE_TABLE_FILENAME = /^\|\s*`?([^`|]+\.\w+)`?\s*\|/
const RE_LEADING_DIGITS = /^\d+-/
const RE_FEATURE_NUMBER = /^(\d+)-/
const RE_PRESERVE_SUFFIX = /-preserve$|-persistence$/
const AC_TABLE_MIN_COLUMNS = 3

/** Parse the markdown "ID | Done when | Evidence" table from handoff.md. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity, refactor deferred
export function parseHandoffAcTable(md: string): AcRow[] {
  const rows: AcRow[] = []
  const lines = md.split('\n')
  let inTable = false
  for (const raw of lines) {
    const line = raw.trim()
    if (!inTable) {
      if (RE_AC_TABLE_HEADER.test(line)) {
        inTable = true
      }
      continue
    }
    if (!line.startsWith('|')) {
      inTable = false
      continue
    }
    if (RE_TABLE_SEPARATOR.test(line)) continue
    const cells = line
      .split('|')
      .slice(1, -1)
      .map(c => c.trim())
    if (cells.length < AC_TABLE_MIN_COLUMNS) continue
    const [id, doneWhen, evidence] = [cells[0] ?? '', cells[1] ?? '', cells[2] ?? '']
    const acTag = toAcTag(id)
    const sliceId = acTag ? sliceIdFromAcTag(acTag) : null
    rows.push({
      id,
      doneWhen,
      evidence,
      acTag,
      sliceId,
      isOperatorSmoke: classifyOperatorSmoke(evidence)
    })
  }
  return rows
}

function toAcTag(id: string): string | null {
  const m = id.trim().match(RE_AC_TAG)
  if (!m?.[1] || !m[2] || !m[3]) return null
  return `@ac:${m[1].toUpperCase()}-${m[2]}_AC${m[3]}`
}

function classifyOperatorSmoke(evidence: string): boolean {
  if (EVIDENCE_TEST_PATTERNS.some(re => re.test(evidence))) return false
  return OPERATOR_SMOKE_PATTERNS.some(re => re.test(evidence))
}

/** Extract a file touch list from plan.md (heading, fallback to path heuristics). */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity, refactor deferred
export function extractFileTouchList(planMd: string | null): string[] {
  if (!planMd) return []
  const lines = planMd.split('\n')
  const explicit: string[] = []
  let captureUntilBlank = false
  for (const raw of lines) {
    if (RE_FILE_TOUCH_HEADING.test(raw)) {
      captureUntilBlank = true
      continue
    }
    if (captureUntilBlank) {
      if (raw.trim() === '' && explicit.length > 0) break
      const bulletMatch = raw.match(RE_BULLET_FILENAME)
      if (bulletMatch?.[1]) explicit.push(bulletMatch[1])
      const tableMatch = raw.match(RE_TABLE_FILENAME)
      if (tableMatch?.[1]) explicit.push(tableMatch[1].trim())
    }
  }
  if (explicit.length > 0) return dedupe(explicit)

  const fallback = new Set<string>()
  const pathRe =
    /\b(assets\/features\/[^\s`)]+|bdd\/(?:unit|e2e)\/[^\s`)]+|src\/[^\s`)]+\.tsx?|assets\/catalog\/catalog\.yaml)\b/g
  for (const raw of lines) {
    for (const m of raw.matchAll(pathRe)) {
      if (m[1]) fallback.add(m[1])
    }
  }
  return [...fallback]
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.map(s => s.trim()).filter(Boolean))]
}

/** Derive catalog key from feature slug (`003-sync-frecency-preserve` → `sync_frecency_preserve`). */
export function catalogKeyFromSlug(slug: string): string {
  return slug.replace(RE_LEADING_DIGITS, '').replace(/-/g, '_')
}

export function slugFromFeatureDir(featureDir: string): string {
  return path.basename(featureDir).replace(RE_LEADING_DIGITS, '')
}

export function featureNumberFromDir(featureDir: string): string {
  const m = path.basename(featureDir).match(RE_FEATURE_NUMBER)
  return m?.[1] ?? '000'
}

/** Render the canonical worker prompt for `tmp/handoffs/opencode-{slug}-{focus}.md`. */
export function renderHandoffPrompt(input: HandoffInput): string {
  const { featureDir, slug, catalogKey, focus, worker, acRows, fileTouchList } = input
  const unitRows = acRows.filter(r => !r.isOperatorSmoke)
  const e2eRows = acRows.filter(r => r.isOperatorSmoke)
  const needsE2eBlock = focus === 'gherkin' && e2eRows.length > 0
  const featureNumber = featureNumberFromDir(featureDir)

  const acTableRows = acRows
    .map(r => {
      const tag = r.acTag ?? '—'
      const slice = r.sliceId ?? '—'
      const evidence = r.evidence || '—'
      return `| ${r.id} | ${tag} | \`${slice}\` | ${evidence} |`
    })
    .join('\n')

  const fileTouchBlock =
    fileTouchList.length > 0
      ? fileTouchList.map(f => `- \`${f}\``).join('\n')
      : '_(plan.md did not declare a File touch list; derive from spec.md + plan.md before editing)_'

  const e2eBlock = needsE2eBlock
    ? `

## @e2e scenarios (Playwright only — NOT @unit)

The following AC(s) are operator-smoke / browser-driven and MUST be implemented
under \`bdd/e2e/\` with Playwright. Do NOT route @unit scenarios through Playwright.

${e2eRows.map(r => `- ${r.id} (\`${r.acTag ?? '—'}\`) — Evidence today: ${r.evidence}`).join('\n')}

Pointers:
- E2e step contracts and tag filter: \`packages/ops/src/governance/registries/catalog/tag.script.ts\` (\`e2eTagExpression\`)
- Fixture path constant: \`bdd/e2e/support/fixtures.support.ts\` (\`FIXTURE_PATHS_FILE\`)
- Tag expression includes \`and @e2e and not @todo\` — preserve this filter.
`
    : ''

  return `# Worker handoff — ${slug} (${focus}, ${worker})

> Auto-generated by \`mise run spec handoff-generate\` from
> \`${featureDir}/handoff.md\`. Edit the source, not this file.

## Agent prompt (copy from here)

\`\`\`text
You are implementing the ${focus} slice for spec ${featureNumber}-${slug}.

Repository: ${path.resolve(featureDir).replace(process.env.HOME ?? '~', '~')}
Catalog key: ${catalogKey}

Required reading:
1. ${featureDir}/spec.md, plan.md, tasks.md, handoff.md
2. assets/guides/BDD_GUIDE.md, assets/guides/TESTING_GUIDE.md
3. assets/guides/SDD_WORKFLOW_GUIDE.md § Plan skill routing — load at most 4 skills (cap rule); never "load all skills" (OHW-7)
4. assets/features/${slug.replace(RE_PRESERVE_SUFFIX, '')}.feature (if it exists)
5. packages/ops/src/governance/registries/catalog/tag.script.ts — \`sliceIdFromAcTag\`, \`e2eTagExpression\`

Architecture (do not violate):
- @unit Cucumber lives in bdd/unit/, runs under bun test via the catalog tag runner.
- @e2e Playwright lives in bdd/e2e/.
- Never route @unit scenarios through Playwright.
- Gherkin lives in assets/features/**/*.feature; tag line MUST include catalog key + slice tag.

Verify before claiming done:
  mise run spec ready ${featureDir} --key ${catalogKey}
\`\`\`

## Acceptance criteria

| AC | Tag | Slice id | Evidence |
| --- | --- | --- | --- |
${acTableRows || '| _(no AC rows parsed from handoff.md)_ | — | — | — |'}

## Per-AC slice commands

${
  unitRows
    .filter(r => r.sliceId)
    .map(r => `- ${r.id} → \`${r.sliceId}\``)
    .join('\n') || '_(no unit slice ids; spec uses non-SF id shape — adapt accordingly)_'
}

Run a single slice: \`mise run test tag ${catalogKey} <slice>\` — full Evidence
column lives in the AC table above; do not duplicate.
${e2eBlock}

## File touch list (from plan.md)

${fileTouchBlock}

## Pitfalls (do not regress)

1. **\`@e2e\` filter** — bddgen e2e MUST filter \`@e2e\` via \`e2eTagExpression()\` in
   \`packages/ops/src/governance/registries/catalog/tag.script.ts\`. Tag expression preserves
   \`and @e2e and not @todo\`.
2. **\`RESERVED_RUN_TAGS\`** — \`packages/ops/src/governance/registries/catalog/tag.script.ts\`
   reserves \`unit\`, \`e2e\`, \`smoke\`, \`regression\`, \`todo\`, etc. Do NOT register
   them as catalog keys; they are runner/layer tags only.
3. **\`FIXTURE_PATHS_FILE\`** — e2e fixtures resolve via the constant in
   \`bdd/e2e/support/fixtures.support.ts\`. Don't hard-code paths in step files.
4. **Cucumber step loading** — register every step module via
   \`bdd/unit/support/register_steps.support.ts\` (single \`--import\`).
5. **Never run @unit steps through Playwright** — @unit binds to bun:sqlite /
   App harness, not browser.

## Runner pointers

- @unit: \`bdd/unit/runner/unit_bdd.runner.ts\` (Cucumber under bun)
- @e2e:  \`bdd/e2e/\` (playwright-bdd)

## After parity

When all AC rows pass individually and together, update
\`${featureDir}/handoff.md\` Evidence column to point at per-slice
\`mise run test tag ${catalogKey} <slice>\` commands.
`
}

export type Args = {
  featureDir: string
  focus: Focus
  worker: Worker
  dispatch: boolean
  dryRun: boolean
}

export function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = {
    focus: 'gherkin',
    worker: 'opencode',
    dispatch: false,
    dryRun: false
  }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    switch (flag) {
      case '--feature': {
        const v = argv[++i]
        if (!v) throw new UsageError('--feature requires a value')
        args.featureDir = v
        break
      }
      case '--focus': {
        const v = argv[++i]
        if (!v || !isFocus(v)) throw new UsageError(`--focus must be one of ${FOCUS_VALUES.join('|')}`)
        args.focus = v as Focus
        break
      }
      case '--worker': {
        const v = argv[++i]
        if (!v || !isWorker(v)) throw new UsageError('--worker must be opencode (v1)')
        args.worker = v as Worker
        break
      }
      case '--dispatch':
        args.dispatch = true
        break
      case '--dry-run':
        args.dryRun = true
        break
      case '--help':
      case '-h':
        throw new UsageError(usageString(), 0)
      default:
        throw new UsageError(`unknown flag: ${flag}`)
    }
  }
  if (!args.featureDir) throw new UsageError('--feature is required')
  return args as Args
}

function isFocus(v: string): v is Focus {
  return (FOCUS_VALUES as readonly string[]).includes(v)
}
function isWorker(v: string): v is Worker {
  return (WORKER_VALUES as readonly string[]).includes(v)
}

function usageString(): string {
  return 'Usage: handoff-generate --feature <dir> [--focus gherkin|catalog|e2e-fix] [--worker opencode] [--dispatch] [--dry-run]'
}

export function loadFeatureContext(featureDir: string): {
  handoff: string
  plan: string | null
  slug: string
  catalogKey: string
} {
  if (!existsSync(featureDir)) {
    throw new UsageError(`feature dir not found: ${featureDir}`)
  }
  const handoffPath = path.join(featureDir, 'handoff.md')
  if (!existsSync(handoffPath)) {
    throw new UsageError(`handoff.md not found at ${handoffPath}`, 1)
  }
  const handoffMd = readFileSync(handoffPath, 'utf-8')
  const planPath = path.join(featureDir, 'plan.md')
  const planMd = existsSync(planPath) ? readFileSync(planPath, 'utf-8') : null
  const slug = slugFromFeatureDir(featureDir)
  return { handoff: handoffMd, plan: planMd, slug, catalogKey: catalogKeyFromSlug(slug) }
}

/** Public test seam: dispatch to opencode when available. */
export function dispatchToOpencode(
  promptBody: string,
  filePath: string,
  options: {
    which?: (bin: string) => string | null
    spawn?: (cmd: string[], opts?: { stdin?: string }) => { exitCode: number | null }
    log?: (msg: string) => void
    writer?: WorkflowRunWriter
    featureDir?: string
  } = {}
): DispatchResult {
  const t0 = performance.now()
  const which = options.which ?? ((binName: string) => Bun.which(binName))
  const spawn =
    options.spawn ??
    ((cmd: string[], opts: { stdin?: string } = {}) => {
      const sub = Bun.spawnSync(cmd, {
        stdout: 'inherit',
        stderr: 'inherit',
        stdin: opts.stdin ? new TextEncoder().encode(opts.stdin) : 'inherit'
      })
      return { exitCode: sub.exitCode }
    })
  const log = options.log ?? ((m: string) => console.error(m))

  const bin = which('opencode')
  const bodyBytes = Buffer.byteLength(promptBody, 'utf-8')
  let result: DispatchResult
  if (!bin) {
    log(`[handoff-generate] opencode not on PATH; wrote ${filePath} (file-only mode)`)
    result = { writtenPath: filePath, dispatched: false, exitCode: 0, bodyBytes }
  } else if (promptBody.length <= ARGV_SAFE_THRESHOLD) {
    const r = spawn(['opencode', 'run', promptBody])
    result = { writtenPath: filePath, dispatched: true, exitCode: r.exitCode ?? 1, bodyBytes }
  } else {
    // Body too large for argv: stream via stdin.
    const r = spawn(['opencode', 'run'], { stdin: promptBody })
    result = { writtenPath: filePath, dispatched: true, exitCode: r.exitCode ?? 1, bodyBytes }
  }
  if (options.writer) {
    options.writer.emit({
      type: 'dispatch_invoked',
      run_id: options.writer.runId,
      ts: new Date().toISOString(),
      feature_dir: options.featureDir ?? '',
      duration_ms: performance.now() - t0,
      opencode_found: !!bin,
      body_bytes: result.bodyBytes,
      exit_code: result.exitCode,
      session_id: null
    })
  }
  return result
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: pre-existing large function, refactor deferred
export function run(
  argv: string[],
  options?: { writer?: WorkflowRunWriter; which?: (bin: string) => string | null; skipScrub?: boolean }
): number {
  const t0 = performance.now()
  const parsed = withUsage(() => parseArgs(argv), 'handoff-generate', usageString())
  if ('exitCode' in parsed) return parsed.exitCode
  const args = parsed.value

  const loaded = withUsage(() => loadFeatureContext(args.featureDir), 'handoff-generate', usageString())
  if ('exitCode' in loaded) return loaded.exitCode
  const ctx = loaded.value

  const writer =
    options?.writer ?? new WorkflowRunWriter(generateRunId(slugFromFeatureDir(args.featureDir)), args.featureDir)

  const { handoff, plan, slug, catalogKey } = ctx
  const acRows = parseHandoffAcTable(handoff)
  if (acRows.length === 0) {
    console.error(
      `handoff-generate: no AC rows parsed from ${args.featureDir}/handoff.md ` +
        '(expected `ID | Done when | Evidence` table)'
    )
    return 1
  }
  const fileTouchList = extractFileTouchList(plan)
  const body = renderHandoffPrompt({
    featureDir: args.featureDir,
    slug,
    catalogKey,
    focus: args.focus,
    worker: args.worker,
    acRows,
    fileTouchList,
    planMd: plan
  })

  if (!options?.skipScrub) {
    try {
      scrubPrompt(body, args.featureDir)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(message)
      return 1
    }
  }

  if (args.dryRun) {
    process.stdout.write(body)
    return 0
  }

  const outDir = path.resolve('tmp/handoffs')
  mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, `${args.worker}-${slug}-${args.focus}.md`)
  writeFileSync(outPath, body, 'utf-8')
  console.log(outPath)

  writer.emit({
    type: 'handoff_written',
    run_id: writer.runId,
    ts: new Date().toISOString(),
    feature_dir: args.featureDir,
    duration_ms: performance.now() - t0,
    path: outPath,
    focus: args.focus,
    ac_row_count: acRows.length,
    has_e2e_block: acRows.some(r => r.isOperatorSmoke)
  })

  const wantDispatch = args.dispatch || process.env.ORCHESTRATED_HANDOFF_DISPATCH === '1'
  if (wantDispatch) {
    const result = dispatchToOpencode(body, outPath, { writer, featureDir: args.featureDir, which: options?.which })
    return result.exitCode
  }
  return 0
}

if (import.meta.main) process.exit(run(process.argv.slice(2)))
