/**
 * Pure ASCII terminal formatter for workflow status reports.
 *
 * Exports `formatWorkflowStatusAscii` — no I/O, no subprocesses, no ANSI,
 * no gum. Produces a single vertical document per the normative output
 * contract in `handoff.ascii-status.prompt.md`.
 */
import type { NodeStatus, WorkflowColumn, WorkflowNode, WorkflowProgressReport } from '@kb/exec'

export type PrettyFlags = {
  showIndex: boolean
}

const STATUS_TOKEN: Record<NodeStatus, string> = {
  done: '[done]',
  current: '',
  next: '[next]',
  pending: '[todo]',
  debt: '[debt]',
  skipped: '[skip]'
}

const KIND_PREFIX: Record<string, string> = {
  command: 'cmd: ',
  artifact: 'file: ',
  task: 'task: ',
  mise: 'mise: '
}

const HEADER_WIDTH = 72

function statusToken(node: WorkflowNode): string {
  return STATUS_TOKEN[node.status] ?? ''
}

function kindPrefix(node: WorkflowNode, showIndex: boolean): string {
  if (!showIndex) return ''
  return KIND_PREFIX[node.kind] ?? 'node: '
}

function truncateLabel(label: string, max: number): string {
  if (label.length <= max) return label
  const taskMatch = label.match(/T\d{3}/)
  if (taskMatch && taskMatch.index != null) {
    const taskEnd = taskMatch.index + taskMatch[0].length
    if (taskEnd <= max) {
      return `${label.slice(0, max - 2)}..`
    }
    return label.slice(0, max - 2) + '..'
  }
  return `${label.slice(0, max - 2)}..`
}

function columnHeader(col: WorkflowColumn, activeCol: boolean): string {
  let title = `-- ${col.title}`
  if (activeCol) title += ' (active)'
  title += ' --'
  const remaining = Math.max(0, HEADER_WIDTH - title.length)
  return title + '-'.repeat(remaining)
}

function columnActive(report: WorkflowProgressReport): boolean[] {
  const activeIdx = report.columns.findIndex(c => c.rail.status === 'next' || c.stack.some(n => n.status === 'next'))
  return report.columns.map((_, i) => i === activeIdx)
}

function columnBlock(col: WorkflowColumn, active: boolean, showIndex: boolean): string[] {
  const lines: string[] = [columnHeader(col, active)]

  const renderRow = (node: WorkflowNode) => {
    const token = statusToken(node)
    const prefix = kindPrefix(node, showIndex)
    const label = `${prefix}${node.label}`
    const truncated = truncateLabel(label, 70)
    const suffix = node.status === 'skipped' ? ' (skipped)' : ''
    return `  ${token}  ${truncated}${suffix}`
  }

  lines.push(renderRow(col.rail))
  for (const node of col.stack) {
    lines.push(renderRow(node))
  }
  return lines
}

function formatMetaLines(report: WorkflowProgressReport): string[] {
  const lines: string[] = []
  if (report.catalogStatus) {
    lines.push(`  Catalog: ${report.catalogKey ?? '?'} (${report.catalogStatus})`)
  }
  if (report.lifecycleMismatch) {
    lines.push('  Lifecycle: mismatch (shipped but not at gate)')
  }
  if (report.artifactDebt.length > 0) {
    lines.push(`  Debt: ${report.artifactDebt.length} blocked artifact(s)`)
  }
  return lines
}

function formatTasks(report: WorkflowProgressReport): string[] {
  if (report.tasks.length === 0) return []
  const done = report.tasks.filter(t => t.done).length
  const lines: string[] = [`Tasks: ${done}/${report.tasks.length} done`]
  const next = report.tasks.find(t => !t.done)
  if (next) {
    const text = next.text ? ` ${next.text}` : ''
    lines.push(`Next task: ${next.id}${text}`)
  }
  return lines
}

function formatCommitChunks(report: WorkflowProgressReport): string[] {
  if (report.commitChunks.length === 0) return []
  const lines: string[] = [`Commit plan (${report.commitChunks.length} chunks):`]
  for (const c of report.commitChunks) {
    const subject = c.subject ? ` ${c.subject}` : ''
    lines.push(`  ${c.id}${subject} (${c.paths.length} paths)`)
  }
  return lines
}

export function formatWorkflowStatusAscii(report: WorkflowProgressReport, flags?: PrettyFlags): string {
  const showIndex = flags ? flags.showIndex : false
  const parts: string[] = []

  parts.push(`Spec workflow . ${report.slug}`)
  parts.push(`  ${report.featureDir}`)
  parts.push('')
  parts.push(`Phase: ${report.currentPhase}`)
  const hint = report.next.focusHint ? `  # ${report.next.focusHint}` : ''
  parts.push(`NEXT:  ${report.next.command}${hint}`)

  const metaLines = formatMetaLines(report)
  if (metaLines.length > 0) parts.push(...metaLines)

  parts.push('')

  const active = columnActive(report)
  for (let i = 0; i < report.columns.length; i++) {
    const col = report.columns[i]
    if (!col) continue
    const block = columnBlock(col, active[i] ?? false, showIndex)
    parts.push(...block)
  }

  parts.push('')

  const taskLines = formatTasks(report)
  if (taskLines.length > 0) parts.push(...taskLines)

  const chunkLines = formatCommitChunks(report)
  if (chunkLines.length > 0) {
    if (taskLines.length === 0) parts.push(...chunkLines)
    else parts.push(...chunkLines)
  }

  parts.push('')
  parts.push(`Next step: ${report.next.command}`)

  return parts.join('\n')
}
