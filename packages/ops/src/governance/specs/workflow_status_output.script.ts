/**
 * spec workflow status output — gum pretty, raw, json, and mermaid renderers.
 *
 * Pretty mode uses gum_theme.script.ts (Andromeda Void). The column grid is
 * built as pre-padded multiline strings in TS with local ANSI for each cell,
 * then joined with a SINGLE `gumJoinHorizontal` call. The sectioned index
 * (Proposal B) uses local ANSI for per-cell styling and ≤5 gum calls total
 * (gumJoinHorizontal + gumJoinVertical per section).
 */
import type { NodeStatus, WorkflowColumn, WorkflowNode, WorkflowProgressReport } from '@kb/exec'
import { ansiFore, ansiMuted, ansiOk, ansiStyle } from '../../support/lib/cli/ansi_theme.script'
import {
  GUM,
  gumAccent,
  gumBadge,
  gumBold,
  gumJoinHorizontal,
  gumJoinVertical,
  gumMuted,
  gumNextSteps,
  gumSection,
  gumWarn
} from '../../support/lib/cli/gum_theme.script'
import { mermaidAsciiWidth, renderMermaidTerminal } from '../../support/lib/cli/mermaid_terminal.script'
import type { RenderMode } from '../../support/lib/cli/render_mode.script'

export type PrettyFlags = {
  showIndex: boolean
  showGrid: boolean
}

const STATUS_GLYPH: Record<NodeStatus, string> = {
  done: '⏺',
  current: '◉',
  next: '▶',
  pending: '○',
  debt: '⊘',
  skipped: '⊝'
}

function glyphFor(status: NodeStatus): string {
  return STATUS_GLYPH[status]
}

const KIND_ICON: Record<string, string> = {
  command: '⌘',
  artifact: '·',
  task: '☐',
  mise: '$'
}

const TASK_DONE_ICON = '☑'

function kindIcon(node: WorkflowNode): string {
  if (node.kind === 'task' && node.status === 'done') return TASK_DONE_ICON
  return KIND_ICON[node.kind] ?? '·'
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

function nodeColor(node: WorkflowNode, groupColor: string): string {
  if (node.status === 'next') return GUM.accent
  if (node.status === 'done') return GUM.success
  if (node.status === 'debt') return GUM.warn
  return groupColor
}

function renderColumnBlock(col: WorkflowColumn, width: number, isActive: boolean): string[] {
  const max = width - 2
  const lines: string[] = []
  const titleColor = isActive ? ansiStyle(col.title, GUM.label, true) : ansiFore(col.title, col.groupColor)
  lines.push(titleColor)
  const railGlyph = glyphFor(col.rail.status)
  const railColor = col.rail.status === 'pending' ? ansiMuted(railGlyph) : ansiFore(railGlyph, col.groupColor)
  lines.push(` ${railColor} ${ansiFore(truncate(col.rail.label, max), col.groupColor)}`)
  for (const node of col.stack) {
    const glyph = glyphFor(node.status)
    const c = nodeColor(node, col.groupColor)
    const styled = node.status === 'next' ? ansiStyle(glyph, c, true) : ansiOk(glyph)
    const label =
      node.status === 'next' ? ansiStyle(truncate(node.label, max), c, true) : ansiMuted(truncate(node.label, max))
    const suffix = node.status === 'skipped' ? ' (skipped)' : ''
    lines.push(` ${styled} ${label}${suffix}`)
  }
  return lines.map(l => padLine(l, width))
}

function renderColumnsGrid(report: WorkflowProgressReport): string {
  const activeIdx = report.columns.findIndex(c => c.rail.status === 'next' || c.stack.some(n => n.status === 'next'))
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
  return `${gumSection('Next step')}  ${gumAccent('▶')} ${cmd}${hint}`
}

/**
 * Sectioned index (Proposal B): sections per pipeline column with kind icons,
 * no Column/Kind columns, row foreground = groupColor, next row bold accent + ▸.
 */
function renderSectionedIndex(report: WorkflowProgressReport): string {
  const parts: string[] = []
  for (const col of report.columns) {
    const header = ansiStyle(`▸ ${col.title}`, col.groupColor, true)
    const rows: string[] = [header]
    const allNodes = [col.rail, ...col.stack]
    for (const node of allNodes) {
      const icon = kindIcon(node)
      const prefix = node.status === 'next' ? '▸ ' : '  '
      const label = truncate(node.label, 50)
      let line: string
      if (node.status === 'next') {
        line = `${prefix}${ansiStyle(icon, GUM.accent, true)} ${ansiStyle(label, GUM.accent, true)}`
      } else if (node.status === 'done') {
        line = `${prefix}${ansiStyle(icon, GUM.success)} ${ansiMuted(label)}`
      } else if (node.status === 'debt') {
        line = `${prefix}${ansiStyle(icon, GUM.warn)} ${ansiMuted(label)}`
      } else {
        line = `${prefix}${ansiFore(icon, col.groupColor)} ${ansiMuted(label)}`
      }
      rows.push(line)
    }
    parts.push(rows.join('\n'))
  }
  if (parts.length === 0) return ''
  const joined = gumJoinVertical(parts)
  return joined
}

function renderPretty(report: WorkflowProgressReport, flags?: PrettyFlags): void {
  const showIndex = flags ? flags.showIndex : false
  const showGrid = flags ? flags.showGrid : true

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
  if (showGrid && wide) {
    console.log(renderColumnsGrid(report))
    console.log('')
  } else if (showGrid) {
    console.log(gumMuted('(narrow terminal — showing summary; use --raw or wider terminal for columns)'))
    console.log('')
  }

  if (showIndex) {
    const index = renderSectionedIndex(report)
    if (index) console.log(index)
    console.log('')
  }

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
    const next = report.tasks.find(t => !t.done)
    if (next) console.log(`  Next task: ${next.id}${next.text ? ` ${next.text}` : ''}`)
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
  'classDef next fill:#5ecfbe,color:#12151c,stroke:#5ecfbe',
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
  return report.columns.findIndex(c => c.rail.status === 'next' || c.stack.some(n => n.status === 'next'))
}

function renderMermaidRails(report: WorkflowProgressReport): string {
  const rails = report.columns.map(col => `  ${col.id}[${mermaidQuote(col.rail.label)}]`)
  const links = report.columns
    .slice(0, -1)
    .map((col, i) => `  ${col.id} --> ${report.columns[i + 1]?.id}`)
    .join('\n')
  const active = report.columns.find(c => c.rail.status === 'next')
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
  const activeStyle = activeCol && activeIdx >= 0 ? `\n  style ${activeCol.id}_col stroke:#5ecfbe,stroke-width:3px` : ''
  return `flowchart LR\n${blocks.join('\n')}\n${links}\n${MERMAID_CLASS_DEFS}${activeStyle}\n`
}

/** Mermaid flowchart LR — rail-only by default; pass `{ subgraph: true }` for column stacks. */
export function renderMermaid(report: WorkflowProgressReport, options?: MermaidRenderOptions): string {
  if (options?.subgraph) return renderMermaidSubgraph(report)
  return renderMermaidRails(report)
}

export type MermaidEmitOptions = MermaidRenderOptions & {
  /** When true, return Mermaid source (for markdown embed / pipes). */
  source?: boolean
  /** Terminal width for subgraph auto-fallback; defaults to stdout.columns or 120. */
  termWidth?: number
}

export type MermaidEmitResult = {
  text: string
  /** Non-fatal operator hint (stderr). */
  note?: string
}

/** Mermaid source or terminal ASCII (beautiful-mermaid) depending on `source` / layout. */
export function emitMermaid(report: WorkflowProgressReport, options?: MermaidEmitOptions): MermaidEmitResult {
  const subgraph = options?.subgraph ?? false
  const source = renderMermaid(report, { subgraph })
  if (options?.source) return { text: source }

  const termWidth = options?.termWidth ?? process.stdout.columns ?? 120
  try {
    let ascii = renderMermaidTerminal(source, subgraph)
    let width = mermaidAsciiWidth(ascii)
    if (width > termWidth && subgraph) {
      const railSource = renderMermaid(report, { subgraph: false })
      ascii = renderMermaidTerminal(railSource, false)
      width = mermaidAsciiWidth(ascii)
      return {
        text: ascii,
        note: `subgraph diagram (${width} cols) exceeds terminal — showing rail-only; use --source for full mermaid`
      }
    }
    return { text: ascii }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { text: source, note: `terminal render failed (${msg}); emitting mermaid source` }
  }
}

/** Render the report in the chosen mode to stdout. */
export function renderWorkflowStatus(report: WorkflowProgressReport, mode: RenderMode, flags?: PrettyFlags): void {
  if (mode === 'json') {
    console.log(JSON.stringify(report, null, 2))
    return
  }
  if (mode === 'raw') {
    renderRaw(report)
    return
  }
  renderPretty(report, flags)
}
