/**
 * review-handoff core — classify diff paths, route skills, extract Evidence commands.
 * Used by mise run spec review-handoff and app-review-handoff skill.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { type AcRow, parseHandoffAcTable } from '@kb/exec'

export const REVIEW_SLICES = ['implement-src', 'gherkin-bdd', 'governance-tools', 'docs-only', 'mixed'] as const

export type ReviewSlice = (typeof REVIEW_SLICES)[number]

export type PathHits = {
  renderer: boolean
  rpc: boolean
  testing: boolean
  logging: boolean
  gherkin: boolean
  governance: boolean
  electrobun: boolean
  docs: boolean
}

export type ReviewSkillRoute = {
  slice: ReviewSlice
  changedPaths: string[]
  hits: PathHits
  skills: string[]
  guides: string[]
  askSplitFollowUp: boolean
}

export type EvidenceCommand = {
  acId: string
  commands: string[]
  operatorSmoke: boolean
  evidenceRaw: string
}

export type ReviewPrepareOutput = {
  featureDir: string | null
  handoffPath: string
  slice: ReviewSlice
  base: string
  head: string
  changedPaths: string[]
  route: ReviewSkillRoute
  acRows: AcRow[]
  evidence: EvidenceCommand[]
  beforeDone: string[]
}

const WORKER_SLICES: ReviewSlice[] = ['implement-src', 'gherkin-bdd', 'governance-tools']

/** Classify path prefixes into review routing buckets. */
export function classifyPathHits(changedPaths: string[]): PathHits {
  const hits: PathHits = {
    renderer: false,
    rpc: false,
    testing: false,
    logging: false,
    gherkin: false,
    governance: false,
    electrobun: false,
    docs: false
  }
  for (const raw of changedPaths) {
    const p = raw.replace(/\\/g, '/')
    if (/src\/shell\/renderer\//.test(p) || /\.css$/i.test(p)) hits.renderer = true
    if (/src\/shell\/app\//.test(p) || /\.routes\.ts$/i.test(p) || /\/rpc\//.test(p)) hits.rpc = true
    if (/\.spec\.tsx?$/i.test(p) || /^bdd\//.test(p)) hits.testing = true
    if (/@shared\/logging/.test(p) || /logging\//.test(p)) hits.logging = true
    if (/^assets\/features\//.test(p) || /^assets\/catalog\//.test(p)) hits.gherkin = true
    if (/^packages\/ops\/src\/governance\//.test(p) || /^tools\/governance\//.test(p) || /^mise\.toml$/.test(p))
      hits.governance = true
    if (/^electrobun\.config\.ts$/.test(p) || /^src\/shell\/main\//.test(p)) hits.electrobun = true
    if (/^assets\/(specs|guides)\//.test(p) || /^\.specify\//.test(p) || /^\.agents\/skills\//.test(p)) hits.docs = true
  }
  return hits
}

function sliceFromHits(hits: PathHits): ReviewSlice {
  const workerHits = [
    hits.renderer || hits.rpc || hits.logging ? 'implement-src' : null,
    hits.gherkin || hits.testing ? 'gherkin-bdd' : null,
    hits.governance ? 'governance-tools' : null
  ].filter(Boolean) as ReviewSlice[]

  if (workerHits.length > 1) return 'mixed'
  if (workerHits.length === 1) return workerHits[0] ?? 'implement-src'
  if (hits.electrobun) return 'implement-src'
  if (hits.docs && !Object.values(hits).some((v, i) => v && i !== 7)) return 'docs-only'
  return 'implement-src'
}

/** Resolve review slice from changed paths and optional focus hint. */
export function classifyReviewSlice(changedPaths: string[], focusHint?: string): ReviewSlice {
  const normalized = focusHint?.trim().toLowerCase()
  if (normalized && (REVIEW_SLICES as readonly string[]).includes(normalized)) {
    return normalized as ReviewSlice
  }
  return sliceFromHits(classifyPathHits(changedPaths))
}

const SKILL_PRIORITY = ['app-testing', 'app-rpc', 'mise-tasks', 'app-logging', 'electrobun-best-practices'] as const

/** Deterministic skill routing (excludes app-context; cap 3). */
export function routeReviewSkills(changedPaths: string[], slice: ReviewSlice): ReviewSkillRoute {
  const hits = classifyPathHits(changedPaths)
  const skills = new Set<string>()
  const guides = new Set<string>()

  if (hits.testing || slice === 'gherkin-bdd') skills.add('app-testing')
  if (hits.rpc || slice === 'implement-src') skills.add('app-rpc')
  if (hits.governance || slice === 'governance-tools') skills.add('mise-tasks')
  if (hits.logging) skills.add('app-logging')
  if (hits.electrobun) skills.add('electrobun-best-practices')
  if (hits.renderer) guides.add('assets/guides/STYLING_GUIDE.md')
  if (hits.gherkin || slice === 'gherkin-bdd') {
    guides.add('assets/guides/BDD_GUIDE.md')
    guides.add('assets/guides/TESTING_GUIDE.md')
  }

  const ordered = [...skills].sort(
    (a, b) =>
      (SKILL_PRIORITY.indexOf(a as (typeof SKILL_PRIORITY)[number]) + 1 || 99) -
      (SKILL_PRIORITY.indexOf(b as (typeof SKILL_PRIORITY)[number]) + 1 || 99)
  )
  const capped = ordered.slice(0, 3)

  const workerHitCount = WORKER_SLICES.filter(s => {
    if (s === 'implement-src') return hits.renderer || hits.rpc || hits.logging || hits.electrobun
    if (s === 'gherkin-bdd') return hits.gherkin || (hits.testing && /^bdd\//.test(changedPaths.join('\n')))
    if (s === 'governance-tools') return hits.governance
    return false
  }).length

  return {
    slice,
    changedPaths,
    hits,
    skills: capped,
    guides: [...guides],
    askSplitFollowUp: workerHitCount > 1 || slice === 'mixed'
  }
}

const BACKTICK_CMD = /`([^`]+)`/g

/** Pull runnable commands from an Evidence cell (backtick segments). */
export function commandsFromEvidenceText(evidence: string): string[] {
  const out: string[] = []
  for (const m of evidence.matchAll(BACKTICK_CMD)) {
    const cmd = m[1]?.trim()
    if (cmd && !/^see\b/i.test(cmd) && !/^same spec/i.test(cmd)) out.push(cmd)
  }
  return out
}

/** Parse handoff markdown AC table into Evidence command rows. */
export function extractEvidenceCommands(handoffMd: string): EvidenceCommand[] {
  return parseHandoffAcTable(handoffMd).map(row => ({
    acId: row.id,
    commands: commandsFromEvidenceText(row.evidence),
    operatorSmoke: row.isOperatorSmoke,
    evidenceRaw: row.evidence
  }))
}

/** Extract lines under "Before done:" in an agent prompt fenced block. */
export function extractBeforeDoneCommands(handoffMd: string): string[] {
  const blocks = [...handoffMd.matchAll(/```text\n([\s\S]*?)```/g)].map(m => m[1] ?? '')
  const commands: string[] = []
  for (const block of blocks) {
    const idx = block.search(/^Before done:\s*$/im)
    if (idx < 0) continue
    const tail = block.slice(idx).split('\n').slice(1)
    for (const line of tail) {
      const t = line.trim()
      if (!t) break
      if (/^Do not commit/i.test(t)) break
      if (/^[A-Za-z]/.test(t)) commands.push(t)
    }
  }
  return commands
}

export function resolveHandoffPath(featureDir: string | null, handoffArg: string | null): string {
  if (handoffArg) return handoffArg
  if (!featureDir) throw new Error('review-handoff: pass --handoff or --feature')
  return path.join(featureDir, 'handoff.md')
}

export function readHandoffMarkdown(handoffPath: string): string {
  return readFileSync(handoffPath, 'utf8')
}

export function gitChangedPaths(base: string, head: string): string[] {
  const proc = Bun.spawnSync(['git', 'diff', '--name-only', `${base}..${head}`], {
    stdout: 'pipe',
    stderr: 'pipe'
  })
  if (proc.exitCode !== 0) {
    throw new Error(`git diff exited ${proc.exitCode}: ${proc.stderr.toString().trim()} (base=${base}, head=${head})`)
  }
  return proc.stdout.toString().trim().split('\n').filter(Boolean)
}

export function prepareReviewInput(opts: {
  handoffPath: string
  featureDir: string | null
  base: string
  head: string
  focus?: string
}): ReviewPrepareOutput {
  const md = readHandoffMarkdown(opts.handoffPath)
  const changedPaths = gitChangedPaths(opts.base, opts.head)
  const slice = classifyReviewSlice(changedPaths, opts.focus)
  const route = routeReviewSkills(changedPaths, slice)
  return {
    featureDir: opts.featureDir,
    handoffPath: opts.handoffPath,
    slice,
    base: opts.base,
    head: opts.head,
    changedPaths,
    route,
    acRows: parseHandoffAcTable(md),
    evidence: extractEvidenceCommands(md),
    beforeDone: extractBeforeDoneCommands(md)
  }
}

export function slugFromFeatureDir(featureDir: string | null, handoffPath: string): string {
  if (featureDir) return path.basename(featureDir.replace(/\\/g, '/'))
  const base = path.basename(handoffPath, '.md')
  const m = base.match(
    /^(?:opencode|review)-(.+?)(?:-(?:implement-src|gherkin-bdd|governance-tools|mixed|docs-only)(?:-[a-f0-9]+)?)?$/i
  )
  if (m?.[1]) return m[1]
  return base || 'unknown'
}

export function gitShortSha(ref = 'HEAD'): string {
  const proc = Bun.spawnSync(['git', 'rev-parse', '--short', ref], { stdout: 'pipe', stderr: 'pipe' })
  if (proc.exitCode !== 0) return 'unknown'
  return proc.stdout.toString().trim() || 'unknown'
}

export function gitBranchName(): string {
  const proc = Bun.spawnSync(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { stdout: 'pipe', stderr: 'pipe' })
  if (proc.exitCode !== 0) return 'unknown'
  return proc.stdout.toString().trim() || 'unknown'
}

export function auditReportPath(slug: string, shortSha: string, repoRoot = process.cwd()): string {
  return path.join(repoRoot, 'tmp', 'reviews', `review-${slug}-${shortSha}.md`)
}

function escapeMdCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

/** Deterministic full audit markdown — agent fills Status, Exit, Blockers, Fix handoff. */
export function buildAuditScaffoldMarkdown(
  input: ReviewPrepareOutput,
  meta: { slug: string; shortSha: string; branch: string; isoTs: string }
): string {
  const lines: string[] = [
    `# Review audit — ${meta.slug} — ${meta.isoTs}`,
    '',
    `Verdict: TBD · Branch: ${meta.branch} · ${input.base}..${input.head} · slice: ${input.slice}`,
    '',
    '## Scope',
    '',
    '_Agent: note committed vs uncommitted paths when relevant._',
    '',
    '## AC matrix',
    '',
    '| ID | Status | Note |',
    '| --- | --- | --- |'
  ]

  for (const row of input.acRows) {
    lines.push(`| ${escapeMdCell(row.id)} | TBD | |`)
  }

  lines.push('', '## Evidence commands', '', '| ID | Command | Exit | Output hint |', '| --- | --- | --- | --- |')

  for (const row of input.evidence) {
    if (row.commands.length === 0) {
      if (row.operatorSmoke) {
        lines.push(`| ${escapeMdCell(row.acId)} | (operator smoke) | SKIP | ${escapeMdCell(row.evidenceRaw)} |`)
      } else {
        lines.push(`| ${escapeMdCell(row.acId)} | (see evidence) | TBD | ${escapeMdCell(row.evidenceRaw)} |`)
      }
      continue
    }
    for (const cmd of row.commands) {
      lines.push(`| ${escapeMdCell(row.acId)} | \`${escapeMdCell(cmd)}\` | TBD | |`)
    }
  }

  if (input.beforeDone.length) {
    lines.push('', '## Before done commands', '', '| Command | Exit | Output hint |', '| --- | --- | --- |')
    for (const cmd of input.beforeDone) {
      lines.push(`| \`${escapeMdCell(cmd)}\` | TBD | |`)
    }
  }

  lines.push(
    '',
    '## Blockers',
    '',
    '_Agent: CRITICAL/IMPORTANT findings — `{location} | {problem} | {fix}`._',
    '',
    '## Fix handoff',
    '',
    '_Agent: copy-paste worker block when verdict ≠ APPROVE._',
    '',
    '## Diff paths',
    ''
  )

  if (input.changedPaths.length === 0) {
    lines.push('_No changed paths in range._')
  } else {
    for (const p of input.changedPaths) lines.push(`- ${p}`)
  }

  lines.push('')
  return lines.join('\n')
}

export type AuditScaffoldResult = {
  path: string
  slug: string
  shortSha: string
  content: string
}

/** Write tmp/reviews/review-{slug}-{shortSha}.md scaffold for agent completion. */
export function scaffoldAuditReport(opts: {
  handoffPath: string
  featureDir: string | null
  base: string
  head: string
  focus?: string
  repoRoot?: string
}): AuditScaffoldResult {
  const repoRoot = opts.repoRoot ?? process.cwd()
  const input = prepareReviewInput(opts)
  const slug = slugFromFeatureDir(opts.featureDir, opts.handoffPath)
  const shortSha = gitShortSha(opts.head)
  const branch = gitBranchName()
  const isoTs = new Date().toISOString()
  const content = buildAuditScaffoldMarkdown(input, { slug, shortSha, branch, isoTs })
  const filePath = auditReportPath(slug, shortSha, repoRoot)
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, content, 'utf8')
  return { path: filePath, slug, shortSha, content }
}
