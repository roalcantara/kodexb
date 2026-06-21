/**
 * Parse `## Commit plan` from tasks.md and cross-check inline *commit:* markers.
 */
import path from 'node:path'
import { readTextFileSync } from '../../support/lib/shared/text_file.script'
import { validateCommitMessage } from '../policies/hooks/commit_message_validate.script'

export type CommitChunk = {
  id: string
  title: string
  phase?: string
  tasks: string[]
  paths: string[]
  subject: string
  body: string
}

export type CommitPlanParseError = {
  kind: 'missing-section' | 'parse' | 'validation' | 'inline-drift' | 'duplicate-id'
  message: string
}

export type CommitPlan = {
  chunks: CommitChunk[]
  inlineSubjects: Map<string, string>
}

const COMMIT_PLAN_HEADER = /^##\s+Commit plan\s*$/i
const CHUNK_HEADER = /^###\s+(C\d+)\s*(?:—|-)\s*(.+)\s*$/i
const PHASE_LINE = /^\s*-\s+\*\*Phase:\*\*\s*([A-Za-z0-9]+)\s*$/
const TASKS_LINE = /^\s*-\s+\*\*Tasks:\*\*\s*(.+)\s*$/
const PATHS_LINE = /^\s*-\s+\*\*Paths:\*\*\s*(.+)\s*$/
const SUBJECT_LINE = /^\s*-\s+\*\*Subject:\*\*\s*`([^`]+)`\s*$/
const BODY_LINE = /^\s*-\s+\*\*Body:\*\*\s*$/
const INLINE_COMMIT = /\*commit:\*\s*`([^`]+)`/
const TASK_ID = /\*\*(T\d{3})\*\*/

function extractBacktickPaths(line: string): string[] {
  const paths: string[] = []
  for (const m of line.matchAll(/`([^`]+)`/g)) {
    const p = m[1]?.trim()
    if (p) paths.push(p)
  }
  return paths
}

function parseTaskIds(raw: string): string[] {
  return [...raw.matchAll(/\bT\d{3}\b/g)].map(m => m[0] ?? '').filter(Boolean)
}

function parseBodyBlock(lines: string[], startIdx: number): { body: string; nextIdx: number } {
  const bodyLines: string[] = []
  let i = startIdx
  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (CHUNK_HEADER.test(line) || COMMIT_PLAN_HEADER.test(line) || /^##\s+/.test(line)) break
    if (line.trim() === '' && bodyLines.length === 0) {
      i++
      continue
    }
    bodyLines.push(line.replace(/^\s{2}/, ''))
    i++
  }
  while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1]?.trim() === '') {
    bodyLines.pop()
  }
  return { body: bodyLines.join('\n'), nextIdx: i }
}

export function parseInlineCommitSubjects(md: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const line of md.split('\n')) {
    const taskMatch = line.match(TASK_ID)
    const commitMatch = line.match(INLINE_COMMIT)
    if (taskMatch?.[1] && commitMatch?.[1]) {
      map.set(taskMatch[1], commitMatch[1].trim())
    }
  }
  return map
}

export function parseCommitPlanFromMarkdown(md: string): { plan?: CommitPlan; errors: CommitPlanParseError[] } {
  const errors: CommitPlanParseError[] = []
  const lines = md.split('\n')
  const sectionStart = lines.findIndex(l => COMMIT_PLAN_HEADER.test(l))
  if (sectionStart < 0) {
    errors.push({ kind: 'missing-section', message: 'Missing `## Commit plan` section in tasks.md' })
    return { errors }
  }

  const inlineSubjects = parseInlineCommitSubjects(md)
  const chunks: CommitChunk[] = []
  const seenIds = new Set<string>()

  let i = sectionStart + 1
  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (/^##\s+/.test(line) && !COMMIT_PLAN_HEADER.test(line)) break

    const chunkMatch = line.match(CHUNK_HEADER)
    if (!chunkMatch) {
      i++
      continue
    }

    const id = (chunkMatch[1] ?? '').toUpperCase()
    const title = (chunkMatch[2] ?? '').trim()
    if (seenIds.has(id)) {
      errors.push({ kind: 'duplicate-id', message: `Duplicate commit plan chunk id ${id}` })
    }
    seenIds.add(id)

    let phase: string | undefined
    let tasks: string[] = []
    let paths: string[] = []
    let subject = ''
    let body = ''
    i++

    while (i < lines.length) {
      const row = lines[i] ?? ''
      if (CHUNK_HEADER.test(row) || (/^##\s+/.test(row) && !COMMIT_PLAN_HEADER.test(row))) break

      const phaseMatch = row.match(PHASE_LINE)
      if (phaseMatch?.[1]) {
        phase = phaseMatch[1].toUpperCase()
        i++
        continue
      }

      const tasksMatch = row.match(TASKS_LINE)
      if (tasksMatch?.[1]) {
        tasks = parseTaskIds(tasksMatch[1])
        i++
        continue
      }

      const pathsMatch = row.match(PATHS_LINE)
      if (pathsMatch?.[1]) {
        paths = extractBacktickPaths(pathsMatch[1])
        if (paths.length === 0) {
          paths = pathsMatch[1]
            .split(/\s+/)
            .map(p => p.trim())
            .filter(p => p.length > 0 && !p.startsWith('**'))
        }
        i++
        continue
      }

      const subjectMatch = row.match(SUBJECT_LINE)
      if (subjectMatch?.[1]) {
        subject = subjectMatch[1].trim()
        i++
        continue
      }

      if (BODY_LINE.test(row)) {
        i++
        const parsed = parseBodyBlock(lines, i)
        body = parsed.body
        i = parsed.nextIdx
        continue
      }

      i++
    }

    if (!subject) {
      errors.push({ kind: 'parse', message: `Chunk ${id} missing **Subject:**` })
    }
    if (!body.trim()) {
      errors.push({ kind: 'parse', message: `Chunk ${id} missing **Body:** block` })
    }
    if (paths.length === 0) {
      errors.push({ kind: 'parse', message: `Chunk ${id} missing **Paths:**` })
    }

    chunks.push({ id, title, phase, tasks, paths, subject, body })
  }

  if (chunks.length === 0) {
    errors.push({ kind: 'parse', message: 'Commit plan section has no ### C# chunks' })
  }

  for (const chunk of chunks) {
    const full = formatCommitMessage(chunk)
    const hk = validateCommitMessage(full)
    if (!hk.ok) {
      errors.push({
        kind: 'validation',
        message: `Chunk ${chunk.id} message invalid: ${hk.failures.join('; ')}`
      })
    }

    for (const taskId of chunk.tasks) {
      const inline = inlineSubjects.get(taskId)
      if (inline && inline !== chunk.subject) {
        errors.push({
          kind: 'inline-drift',
          message: `Task ${taskId} inline commit \`${inline}\` ≠ chunk ${chunk.id} subject \`${chunk.subject}\``
        })
      }
    }
  }

  if (errors.length > 0) return { errors }
  return { plan: { chunks, inlineSubjects }, errors: [] }
}

export function formatCommitMessage(chunk: CommitChunk): string {
  return `${chunk.subject}\n\n${chunk.body}\n`
}

export function normalizeCommitMessageText(text: string): string {
  return text.replace(/\r\n/g, '\n').trimEnd()
}

export function readCommitPlan(featureDir: string): {
  plan?: CommitPlan
  errors: CommitPlanParseError[]
  tasksPath: string
} {
  const tasksPath = path.join(featureDir, 'tasks.md')
  const tasksResult = readTextFileSync(tasksPath)
  if (tasksResult.isErr()) {
    return {
      errors: [{ kind: 'missing-section', message: `Cannot read ${tasksPath}` }],
      tasksPath
    }
  }
  const parsed = parseCommitPlanFromMarkdown(tasksResult.value)
  return { ...parsed, tasksPath }
}

export function resolveChunkByPhaseId(plan: CommitPlan, phaseId: string): CommitChunk | null {
  const raw = phaseId.trim()
  if (!raw) return null

  const upper = raw.toUpperCase()
  if (/^C\d+$/.test(upper)) {
    return plan.chunks.find(c => c.id === upper) ?? null
  }

  if (/^\d+$/.test(raw)) {
    const idx = Number.parseInt(raw, 10) - 1
    return plan.chunks[idx] ?? null
  }

  const letter = upper.length === 1 ? upper : null
  if (letter) {
    const byPhase = plan.chunks.find(c => c.phase?.toUpperCase() === letter)
    if (byPhase) return byPhase
  }

  return null
}

export function validateCommitPlan(featureDir: string): { ok: boolean; errors: CommitPlanParseError[] } {
  const { errors } = readCommitPlan(featureDir)
  return { ok: errors.length === 0, errors }
}
