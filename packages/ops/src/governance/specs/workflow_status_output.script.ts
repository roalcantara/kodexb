/**
 * spec workflow status output — gum pretty, raw, json, and mermaid renderers.
 *
 * Pretty mode uses gum_theme.script.ts (Andromeda Void). The column grid is
 * built as pre-padded multiline strings in TS, then joined with a SINGLE
 * `gumJoinHorizontal` call (AC-5: ≤2 gum subprocesses for the grid). The
 * artifact index uses one `gumTable` call.
 */
import type { NodeStatus, WorkflowColumn, WorkflowProgressReport } from '@kb/exec'
import {
  GUM,
  gumAccent,
  gumBadge,
  gumBold,
  gumFore,
  gumInfo,
  gumJoinHorizontal,
  gumMuted,
  gumNextSteps,
  gumOk,
  gumSection,
  gumTable,
  gumWarn
} from '../../support/lib/cli/gum_theme.script'
import type { RenderMode } from '../../support/lib/cli/render_mode.script'

const STATUS_GLYPH: Record<NodeStatus, string> = {
  done: '⏺',
  current: '◉',
  pending: '○',
  debt: '⊘',
  skipped: '⊝'
}

function glyphFor(status: NodeStatus): string {
  return STATUS_GLYPH[status]
}

const ESC = String.fromCharCode(27)
const ANSI_RE = new RegExp(`${ESC}\\[[0-9;]*m`, 'g')

function columnWidth(col: WorkflowColumn): number {
  const labels = [col.rail.label, ...col.stack.map(n => n.label), col.title]
  const widest = Math.max(...labels.map(l => l.length))
  return Math.min(28, Math.max(14, widest + 2))
}

function padLine(text: string, width: number): string {
  const clean = text.replace(ANSI_RE, '')
  if (clean.length > width) {
    return `${text.slice(0, width - 1)}…`
  }
  const cleanPad = ' '.repeat(Math.max(0, width - clean.length))
  return `${text}${cleanPad}`
}

function truncate(label: string, max: number): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label
}

function renderColumnBlock(col: WorkflowColumn, width: number, isActive: boolean): string[] {
  const max = width - 2
  const lines: string[] = []
  const titleColor = isActive ? gumBold(col.title, col.groupColor) : gumFore(col.title, col.groupColor)
  lines.push(titleColor)
  const railGlyph = glyphFor(col.rail.status)
  const railColor = col.rail.status === 'pending' ? gumMuted(railGlyph) : gumFore(railGlyph, col.groupColor)
  lines.push(` ${railColor} ${gumFore(truncate(col.rail.label, max), col.groupColor)}`)
  for (const node of col.stack) {
    const glyph = glyphFor(node.status)
    const colorizer =
      node.status === 'done'
        ? gumOk
        : node.status === 'current'
          ? gumAccent
          : node.status === 'debt'
            ? gumWarn
            : gumMuted
    const suffix = node.status === 'skipped' ? ' (skipped)' : ''
    lines.push(` ${colorizer(glyph)} ${gumMuted(truncate(node.label, max - suffix.length))}${suffix}`)
  }
  return lines.map(l => padLine(l, width))
}

function renderColumnsGrid(report: WorkflowProgressReport): string {
  const activeIdx = report.columns.findIndex(
    c => c.rail.status === 'current' || c.stack.some(n => n.status === 'current')
  )
  const widths = report.columns.map(c => columnWidth(c))
  const blocks = report.columns.map((c, i) => {
    const lines = renderColumnBlock(c, widths[i] ?? 16, i === activeIdx)
    return lines.join('\n')
  })
  return gumJoinHorizontal(blocks)
}

function nextBanner(report: WorkflowProgressReport): string {
  const cmd = gumBold(report.next.command, GUM.label)
  const hint = report.next.focusHint ? `    ${gumMuted(`# ${report.next.focusHint}`)}` : ''
  return `${gumSection('Next step')}  ${gumAccent('◉')} ${cmd}${hint}`
}

function artifactIndexTable(report: WorkflowProgressReport): string {
  const rows = report.columns.flatMap(col =>
    [col.rail, ...col.stack].map(node => {
      const colLabel = col.title.split(' · ')[0] ?? col.title
      const statusText =
        node.status === 'debt'
          ? gumWarn(node.status)
          : node.status === 'done'
            ? gumOk(node.status)
            : node.status === 'current'
              ? gumAccent(node.status)
              : gumMuted(node.status)
      return [gumMuted(colLabel), gumInfo(node.kind), gumMuted(truncate(node.label, 40)), statusText]
    })
  )
  return gumTable(['Column', 'Kind', 'Label', 'Status'], rows)
}

function renderPretty(report: WorkflowProgressReport): void {
  const debtBadge =
    report.artifactDebt.length > 0 ? `  ${gumBadge(`${report.artifactDebt.length} debt`, GUM.warn)}` : ''
  const catalogBadge =
    report.catalogStatus === 'shipped' ? `  ${gumBadge(`catalog: ${report.catalogKey ?? '?'}`, GUM.success)}` : ''
  const lifecycle = report.lifecycleMismatch ? `  ${gumWarn('⚠ lifecycle mismatch')}` : ''

  console.log(`${gumSection(`Spec workflow · ${report.slug}`)}${debtBadge}${catalogBadge}${lifecycle}`)
  console.log(gumMuted(report.featureDir))
  console.log('')

  console.log(nextBanner(report))
  console.log('')

  const wide = (process.stdout.columns ?? 120) >= 115
  if (wide) {
    console.log(renderColumnsGrid(report))
    console.log('')
  } else {
    console.log(gumMuted('(narrow terminal — showing summary; use --raw or wider terminal for columns)'))
    console.log('')
  }

  console.log(gumSection('Artifact index'))
  const table = artifactIndexTable(report)
  if (table) console.log(table)
  console.log('')

  gumNextSteps([report.next.command])
}

function renderRaw(report: WorkflowProgressReport): void {
  console.log(`Spec workflow · ${report.slug}`)
  console.log(`  ${report.featureDir}`)
  console.log(`  Phase: ${report.currentPhase}`)
  console.log(`  NEXT: ${report.next.command}${report.next.focusHint ? `  # ${report.next.focusHint}` : ''}`)
  if (report.catalogStatus) {
    console.log(`  Catalog: ${report.catalogKey ?? '?'} (${report.catalogStatus})`)
  }
  if (report.lifecycleMismatch) console.log('  ⚠ lifecycle mismatch (shipped but not at gate)')
  if (report.artifactDebt.length > 0) {
    console.log(`  Debt (${report.artifactDebt.length}):`)
    for (const d of report.artifactDebt) {
      console.log(`    ⊘ ${d.path} blocked at ${d.blockedAt}${d.unblockCommand ? ` → ${d.unblockCommand}` : ''}`)
    }
  }
  console.log('  Columns:')
  for (const col of report.columns) {
    console.log(`    [${col.id}] ${glyphFor(col.rail.status)} ${col.rail.label}`)
    for (const node of col.stack) {
      const suffix = node.status === 'skipped' ? ' (skipped)' : ''
      console.log(`      ${glyphFor(node.status)} ${node.label}${suffix}`)
    }
  }
  if (report.tasks.length > 0) {
    const done = report.tasks.filter(t => t.done).length
    console.log(`  Tasks: ${done}/${report.tasks.length} done`)
    const current = report.tasks.find(t => !t.done)
    if (current) console.log(`  Current task: ${current.id}${current.text ? ` ${current.text}` : ''}`)
  }
  if (report.commitChunks.length > 0) {
    console.log(`  Commit plan (${report.commitChunks.length} chunks):`)
    for (const c of report.commitChunks) {
      console.log(`    ${c.id}${c.subject ? ` ${c.subject}` : ''} (${c.paths.length} paths)`)
    }
  }
}

export type MermaidRenderOptions = {
  /** When true, emit one subgraph per column with rail + stack nodes and status classes. */
  subgraph?: boolean
}

const MERMAID_CLASS_DEFS = [
  'classDef done fill:#1a3d36,stroke:#5ecfbe,color:#e2e9f5',
  'classDef current fill:#5ecfbe,color:#12151c,stroke:#5ecfbe',
  'classDef pending fill:#1a1f29,stroke:#8892a4,color:#8892a4',
  'classDef debt fill:#3d2a1a,stroke:#f59e0b,color:#f59e0b',
  'classDef skipped fill:#1a1f29,stroke:#8892a4,color:#8892a4,stroke-dasharray:4 4'
].join('\n')

const SUBGRAPH_LABEL_MAX = 40

function mermaidQuote(label: string): string {
  const clean = label.replace(/"/g, '#quot;').replace(/\n/g, ' ')
  return `"${clean}"`
}

function truncateMermaidLabel(label: string, max: number): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label
}

function activeColumnIndex(report: WorkflowProgressReport): number {
  return report.columns.findIndex(
    c => c.rail.status === 'current' || c.stack.some(n => n.status === 'current')
  )
}

function renderMermaidRails(report: WorkflowProgressReport): string {
  const rails = report.columns.map(col => `  ${col.id}[${mermaidQuote(col.rail.label)}]`)
  const links = report.columns
    .slice(0, -1)
    .map((col, i) => `  ${col.id} --> ${report.columns[i + 1]?.id}`)
    .join('\n')
  const active = report.columns.find(c => c.rail.status === 'current')
  const activeLine = active ? `\n  style ${active.id} fill:#5ecfbe,color:#12151c,stroke:#5ecfbe` : ''
  return `flowchart LR\n${rails.join('\n')}\n${links}${activeLine}\n`
}

function renderMermaidSubgraph(report: WorkflowProgressReport): string {
  const activeIdx = activeColumnIndex(report)
  const blocks = report.columns.map(col => {
    const sgId = `${col.id}_col`
    const railId = `${col.id}_rail`
    const railLine = `    ${railId}[${mermaidQuote(col.rail.label)}]:::${col.rail.status}`
    const stackLines = col.stack.map((node, i) => {
      const nodeId = `${col.id}_s${i}`
      const label = truncateMermaidLabel(node.label, SUBGRAPH_LABEL_MAX)
      return `    ${nodeId}[${mermaidQuote(label)}]:::${node.status}`
    })
    const inner = [railLine, ...stackLines].join('\n')
    return `  subgraph ${sgId}[${mermaidQuote(col.title)}]\n    direction TB\n${inner}\n  end`
  })
  const links = report.columns
    .slice(0, -1)
    .map((col, i) => `  ${col.id}_col --> ${report.columns[i + 1]?.id}_col`)
    .join('\n')
  const activeCol = report.columns[activeIdx]
  const activeStyle =
    activeCol && activeIdx >= 0
      ? `\n  style ${activeCol.id}_col stroke:#5ecfbe,stroke-width:3px`
      : ''
  return `flowchart LR\n${blocks.join('\n')}\n${links}\n${MERMAID_CLASS_DEFS}${activeStyle}\n`
}

/** Mermaid flowchart LR — rail-only by default; pass `{ subgraph: true }` for column stacks. */
export function renderMermaid(report: WorkflowProgressReport, options?: MermaidRenderOptions): string {
  if (options?.subgraph) return renderMermaidSubgraph(report)
  return renderMermaidRails(report)
}

/** Render the report in the chosen mode to stdout. */
export function renderWorkflowStatus(report: WorkflowProgressReport, mode: RenderMode): void {
  if (mode === 'json') {
    console.log(JSON.stringify(report, null, 2))
    return
  }
  if (mode === 'raw') {
    renderRaw(report)
    return
  }
  renderPretty(report)
}
