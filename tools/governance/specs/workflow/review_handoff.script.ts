#!/usr/bin/env bun
import { UsageError, withUsage } from '@kb/workflow-runtime'
/**
 * mise run spec review-handoff — classify diff, route skills, extract Evidence.
 *
 *   classify         — slice + skill routing from git diff
 *   extract-evidence — AC Evidence commands from handoff markdown
 *   prepare          — combined JSON/text for reviewer agents
 *   scaffold-audit   — write tmp/reviews/review-{slug}-{sha}.md audit scaffold
 */
import { chdirToRepoRoot } from '../../../support/lib/shared/repo_root.script.ts'
import {
  classifyReviewSlice,
  extractBeforeDoneCommands,
  extractEvidenceCommands,
  gitChangedPaths,
  prepareReviewInput,
  type ReviewPrepareOutput,
  readHandoffMarkdown,
  resolveHandoffPath,
  routeReviewSkills,
  scaffoldAuditReport
} from './review_handoff_core.script.ts'

const ACTIONS = ['classify', 'extract-evidence', 'prepare', 'scaffold-audit'] as const
type Action = (typeof ACTIONS)[number]

type CliOpts = {
  action: Action
  featureDir: string | null
  handoffPath: string | null
  base: string
  head: string
  focus: string | undefined
  json: boolean
}

function parseArgs(argv: string[]): CliOpts {
  let action: Action | null = null
  let featureDir: string | null = null
  let handoffPath: string | null = null
  let base = 'HEAD~1'
  let head = 'HEAD'
  let focus: string | undefined
  let json = false

  const positional: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--feature' && argv[i + 1]) {
      featureDir = argv[++i] ?? null
      continue
    }
    if (a === '--handoff' && argv[i + 1]) {
      handoffPath = argv[++i] ?? null
      continue
    }
    if (a === '--base' && argv[i + 1]) {
      base = argv[++i] ?? base
      continue
    }
    if (a === '--head' && argv[i + 1]) {
      head = argv[++i] ?? head
      continue
    }
    if (a === '--focus' && argv[i + 1]) {
      focus = argv[++i]
      continue
    }
    if (a === '--json') {
      json = true
      continue
    }
    if (a?.startsWith('--')) throw new UsageError(`unknown flag ${a}`)
    if (a) positional.push(a)
  }

  if (positional.length !== 1) {
    throw new UsageError(`expected action: ${ACTIONS.join('|')}`)
  }
  const raw = positional[0]
  if (!raw || !(ACTIONS as readonly string[]).includes(raw)) {
    throw new UsageError(`unknown action "${raw ?? ''}". Use: ${ACTIONS.join('|')}`)
  }
  action = raw as Action

  return { action, featureDir, handoffPath, base, head, focus, json }
}

function printClassify(opts: CliOpts): void {
  const changed = gitChangedPaths(opts.base, opts.head)
  const slice = classifyReviewSlice(changed, opts.focus)
  const route = routeReviewSkills(changed, slice)
  const payload = {
    base: opts.base,
    head: opts.head,
    changedCount: changed.length,
    changedPaths: changed,
    slice: route.slice,
    skills: ['app-context', ...route.skills],
    guides: route.guides,
    askSplitFollowUp: route.askSplitFollowUp,
    hits: route.hits
  }
  if (opts.json) {
    console.log(JSON.stringify(payload, null, 2))
    return
  }
  console.log(`slice: ${route.slice}`)
  console.log(`diff: ${opts.base}..${opts.head} (${changed.length} files)`)
  console.log(`skills: app-context, ${route.skills.join(', ') || '—'}`)
  if (route.guides.length) console.log(`guides: ${route.guides.join(', ')}`)
  if (route.askSplitFollowUp) console.log('follow-up: ask split handoff (mixed slices)')
}

function printExtractEvidence(opts: CliOpts): void {
  const handoff = resolveHandoffPath(opts.featureDir, opts.handoffPath)
  const md = readHandoffMarkdown(handoff)
  const evidence = extractEvidenceCommands(md)
  const beforeDone = extractBeforeDoneCommands(md)
  const payload = { handoffPath: handoff, evidence, beforeDone }
  if (opts.json) {
    console.log(JSON.stringify(payload, null, 2))
    return
  }
  console.log(`handoff: ${handoff}`)
  for (const row of evidence) {
    const cmds = row.commands.length ? row.commands.join('; ') : '(operator smoke — no auto cmd)'
    console.log(`${row.acId} | ${cmds}`)
  }
  if (beforeDone.length) {
    console.log('Before done:')
    for (const cmd of beforeDone) console.log(`  ${cmd}`)
  }
}

function resolveCommonParams(opts: CliOpts) {
  return {
    handoffPath: resolveHandoffPath(opts.featureDir, opts.handoffPath),
    featureDir: opts.featureDir,
    base: opts.base,
    head: opts.head,
    focus: opts.focus
  }
}
function printPrepare(opts: CliOpts): void {
  const out = prepareReviewInput(resolveCommonParams(opts))
  if (opts.json) {
    console.log(JSON.stringify(serializePrepare(out), null, 2))
    return
  }
  printPrepareText(out)
}

function serializePrepare(out: ReviewPrepareOutput) {
  return {
    ...out,
    route: {
      ...out.route,
      skills: ['app-context', ...out.route.skills]
    }
  }
}

function printPrepareText(out: ReviewPrepareOutput): void {
  console.log(`handoff: ${out.handoffPath}`)
  if (out.featureDir) console.log(`feature: ${out.featureDir}`)
  console.log(`slice: ${out.slice}`)
  console.log(`diff: ${out.base}..${out.head} (${out.changedPaths.length} files)`)
  console.log(`skills: app-context, ${out.route.skills.join(', ')}`)
  if (out.route.guides.length) console.log(`guides: ${out.route.guides.join(', ')}`)
  if (out.route.askSplitFollowUp) console.log('follow-up: ask split handoff (mixed slices)')
  console.log(`ac_rows: ${out.acRows.length}`)
  for (const row of out.evidence) {
    const cmds = row.commands.length ? row.commands.join('; ') : '(operator smoke)'
    console.log(`  ${row.acId} | ${cmds}`)
  }
  if (out.beforeDone.length) {
    console.log('before_done:')
    for (const cmd of out.beforeDone) console.log(`  ${cmd}`)
  }
}

function printScaffoldAudit(opts: CliOpts): void {
  const result = scaffoldAuditReport(resolveCommonParams(opts))
  if (opts.json) {
    console.log(JSON.stringify({ path: result.path, slug: result.slug, shortSha: result.shortSha }, null, 2))
    return
  }
  console.log(result.path)
}

function main(): void {
  chdirToRepoRoot()
  const usage =
    'usage: review-handoff <classify|extract-evidence|prepare|scaffold-audit> [--feature DIR] [--handoff PATH] [--base SHA] [--head SHA] [--focus KIND] [--json]'
  const parsed = withUsage(() => parseArgs(process.argv.slice(2)), 'review-handoff', usage)
  if ('exitCode' in parsed) process.exit(parsed.exitCode)

  const opts = parsed.value
  switch (opts.action) {
    case 'classify':
      printClassify(opts)
      break
    case 'extract-evidence':
      printExtractEvidence(opts)
      break
    case 'prepare':
      printPrepare(opts)
      break
    case 'scaffold-audit':
      printScaffoldAudit(opts)
      break
  }
}

if (import.meta.main) main()
