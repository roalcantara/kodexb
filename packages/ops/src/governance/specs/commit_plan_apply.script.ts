/**
 * Apply Commit plan chunks with gate + HK validation per chunk (commit-all semantics).
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { validateCommitMessage } from '../policies/hooks/commit_message_validate.script'
import {
  type CommitChunk,
  formatCommitMessage,
  normalizeCommitMessageText,
  readCommitPlan,
  resolveChunkByPhaseId
} from './commit_plan_parse.script'

const GATE_SH = '.agents/skills/app-quality-gate/scripts/gate.sh'

export type ApplyChunkOpts = {
  root: string
  featureDir: string
  chunk: CommitChunk
  messageOverride?: string
  dryRun?: boolean
}

export type ApplyRemainingOpts = {
  root: string
  featureDir: string
  messageOverride?: string
  dryRun?: boolean
  strictCoverage?: boolean
}

export type ApplyPhaseOpts = {
  root: string
  featureDir: string
  phaseId: string
  messageOverride?: string
  dryRun?: boolean
}

function git(args: string[], cwd: string): { exitCode: number; stdout: string; stderr: string } {
  const proc = Bun.spawnSync(['git', ...args], { cwd, stdout: 'pipe', stderr: 'pipe' })
  return {
    exitCode: proc.exitCode ?? 1,
    stdout: proc.stdout ? new TextDecoder().decode(proc.stdout) : '',
    stderr: proc.stderr ? new TextDecoder().decode(proc.stderr) : ''
  }
}

export function listDirtyPaths(root: string): string[] {
  const status = git(['status', '--porcelain'], root)
  if (status.exitCode !== 0) return []
  const paths: string[] = []
  for (const line of status.stdout.split('\n')) {
    if (!line.trim()) continue
    const filePart = line.slice(3).trim()
    const p = filePart.includes(' -> ') ? (filePart.split(' -> ').pop()?.trim() ?? filePart) : filePart
    if (p) paths.push(p)
  }
  return paths
}

function pathsForChunk(chunk: CommitChunk, dirty: string[]): string[] {
  return chunk.paths.filter(p => dirty.some(d => d === p || d.startsWith(`${p}/`)))
}

function resolveMessage(
  chunk: CommitChunk,
  override?: string
): { ok: true; text: string } | { ok: false; error: string } {
  const planned = normalizeCommitMessageText(formatCommitMessage(chunk))
  if (!override?.trim()) return { ok: true, text: planned }

  const normalized = normalizeCommitMessageText(override.replace(/\\n/g, '\n'))
  if (normalized !== planned) {
    return {
      ok: false,
      error: `Commit message does not match Commit plan chunk ${chunk.id} (pass -c only when it matches tasks.md)`
    }
  }
  return { ok: true, text: normalized }
}

function verifyHkMessage(root: string, message: string): number {
  const dir = mkdtempSync(path.join(tmpdir(), 'commit-plan-msg-'))
  try {
    const filePath = path.join(dir, 'COMMIT_EDITMSG')
    writeFileSync(filePath, message.endsWith('\n') ? message : `${message}\n`)
    const hk = validateCommitMessage(message)
    if (!hk.ok) {
      console.error('commit plan: HK validation failed')
      for (const f of hk.failures) console.error(f)
      return 1
    }
    const proc = Bun.spawnSync(['mise', 'exec', '--', 'hk', 'run', 'commit-msg', filePath], {
      cwd: root,
      stdout: 'inherit',
      stderr: 'inherit'
    })
    return proc.exitCode ?? 1
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function runQualityGate(root: string): number {
  const proc = Bun.spawnSync(['bash', GATE_SH], {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit'
  })
  return proc.exitCode ?? 1
}

export function applyChunk(opts: ApplyChunkOpts): number {
  const dirty = listDirtyPaths(opts.root)
  const stagePaths = pathsForChunk(opts.chunk, dirty)
  if (stagePaths.length === 0) {
    console.error(`commit plan: chunk ${opts.chunk.id} — no dirty paths to stage (skipped)`)
    return 0
  }

  const msgResult = resolveMessage(opts.chunk, opts.messageOverride)
  if (!msgResult.ok) {
    console.error(`commit plan: ${msgResult.error}`)
    return 1
  }

  if (opts.dryRun) {
    console.log(`commit plan [dry-run] chunk ${opts.chunk.id}`)
    console.log(`  stage: ${stagePaths.join(' ')}`)
    console.log(msgResult.text)
    return 0
  }

  const add = git(['add', '--', ...stagePaths], opts.root)
  if (add.exitCode !== 0) return add.exitCode

  const stash = git(['stash', 'push', '--keep-index', '-m', 'commit-plan: pending'], opts.root)
  if (stash.exitCode !== 0) return stash.exitCode

  const gateExit = runQualityGate(opts.root)
  if (gateExit !== 0) {
    git(['stash', 'pop'], opts.root)
    console.error('commit plan: quality gate failed — stash restored')
    return gateExit
  }

  const commit = git(['commit', '-m', opts.chunk.subject, '-m', opts.chunk.body], opts.root)
  if (commit.exitCode !== 0) {
    git(['stash', 'pop'], opts.root)
    return commit.exitCode
  }

  const hkExit = verifyHkMessage(opts.root, msgResult.text)
  if (hkExit !== 0) {
    console.error('commit plan: HK commit-msg failed after commit — amend message manually')
    git(['stash', 'pop'], opts.root)
    return hkExit
  }

  git(['stash', 'pop'], opts.root)
  console.error(`commit plan: committed chunk ${opts.chunk.id} (${stagePaths.length} path(s))`)
  return 0
}

function loadCommitPlanOrFail(featureDir: string) {
  const { plan, errors } = readCommitPlan(featureDir)
  if (!plan || errors.length > 0) {
    console.error('commit plan: invalid or missing Commit plan in tasks.md')
    for (const e of errors) console.error(`  - ${e.message}`)
    return null
  }
  return plan
}

export function applyRemaining(opts: ApplyRemainingOpts): number {
  const plan = loadCommitPlanOrFail(opts.featureDir)
  if (!plan) return 1

  if (opts.strictCoverage) {
    const dirty = listDirtyPaths(opts.root)
    const covered = new Set(plan.chunks.flatMap(c => c.paths))
    const orphans = dirty.filter(d => ![...covered].some(p => d === p || d.startsWith(`${p}/`)))
    if (orphans.length > 0) {
      console.error('commit plan: dirty paths not covered by Commit plan:')
      for (const o of orphans) console.error(`  - ${o}`)
      return 1
    }
  }

  let exit = 0
  for (const chunk of plan.chunks) {
    const code = applyChunk({
      root: opts.root,
      featureDir: opts.featureDir,
      chunk,
      messageOverride: opts.messageOverride,
      dryRun: opts.dryRun
    })
    if (code !== 0) exit = code
  }
  return exit
}

export function applyPhaseCommit(opts: ApplyPhaseOpts): number {
  const plan = loadCommitPlanOrFail(opts.featureDir)
  if (!plan) return 1

  const chunk = resolveChunkByPhaseId(plan, opts.phaseId)
  if (!chunk) {
    console.error(`commit plan: no chunk for phase id "${opts.phaseId}"`)
    return 1
  }

  return applyChunk({
    root: opts.root,
    featureDir: opts.featureDir,
    chunk,
    messageOverride: opts.messageOverride,
    dryRun: opts.dryRun
  })
}

export function commitPlanStatus(featureDir: string, root: string): number {
  const { plan, errors } = readCommitPlan(featureDir)
  if (!plan || errors.length > 0) {
    for (const e of errors) console.error(e.message)
    return 1
  }
  const dirty = listDirtyPaths(root)
  for (const chunk of plan.chunks) {
    const pending = pathsForChunk(chunk, dirty)
    const state = pending.length > 0 ? 'pending' : 'clean'
    console.log(`${chunk.id} ${state}${pending.length ? `: ${pending.join(', ')}` : ''}`)
  }
  return 0
}
