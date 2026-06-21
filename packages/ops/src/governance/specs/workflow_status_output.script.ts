/**
 * spec workflow status output — ASCII pretty, raw, json, and mermaid renderers.
 *
 * Pretty mode uses a pure-ASCII formatter (no gum, no ANSI). Raw, JSON, and
 * Mermaid paths are unchanged.
 */
import type { WorkflowProgressReport } from '@kb/exec'
import { mermaidAsciiWidth, renderMermaidTerminal } from '../../support/lib/cli/mermaid_terminal.script'
import type { RenderMode } from '../../support/lib/cli/render_mode.script'
import type { PrettyFlags } from './workflow_status_ascii.script'
import { formatWorkflowStatusAscii } from './workflow_status_ascii.script'

export type { PrettyFlags }

const RAW_GLYPH: Record<string, string> = {
  done: '⏺',
  current: '◉',
  next: '▶',
  pending: '○',
  debt: '⊘',
  skipped: '⊝'
}

function renderRaw(report: WorkflowProgressReport): void {
  const g = (s: string) => RAW_GLYPH[s] ?? '?'
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
    console.log(`    [${col.id}] ${g(col.rail.status)} ${col.rail.label}`)
    for (const node of col.stack) {
      const suffix = node.status === 'skipped' ? ' (skipped)' : ''
      console.log(`      ${g(node.status)} ${node.label}${suffix}`)
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

function renderPretty(report: WorkflowProgressReport, flags?: PrettyFlags): void {
  console.log(formatWorkflowStatusAscii(report, flags))
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
