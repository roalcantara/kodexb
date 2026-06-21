/**
 * HTML export for `mise run spec workflow status -o report.html`.
 *
 * Self-contained document (no external assets). Six-column CSS grid matching
 * the Gemini Scenario B mock in `.cursor/plans/proposal_gemini.md`. Andromeda
 * Void palette.
 */
import type { NodeStatus, WorkflowColumn, WorkflowNode, WorkflowProgressReport } from '@kb/exec'

const BG = '#12151c'
const PANEL_BG = '#1a1f29'
const TEXT = '#e2e9f5'
const MUTED = '#8892a4'

const STATUS_GLYPH: Record<NodeStatus, string> = {
  done: '⏺',
  current: '◉',
  pending: '○',
  debt: '⊘',
  skipped: '⊝'
}

const STATUS_COLOR: Record<NodeStatus, string> = {
  done: '#5ecfbe',
  current: '#5ecfbe',
  pending: MUTED,
  debt: '#f59e0b',
  skipped: MUTED
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function nodeLine(node: WorkflowNode): string {
  const glyph = STATUS_GLYPH[node.status]
  const color = STATUS_COLOR[node.status]
  const label = node.status === 'skipped' ? `${esc(node.label)} (skipped)` : esc(node.label)
  return `<div style="color: ${color}; font-size: 12px; margin-left: 4px; margin-bottom: 4px;">${glyph} ${label}</div>`
}

function columnBlock(col: WorkflowColumn, isActive: boolean): string {
  const border = isActive ? `2px solid ${col.groupColor}` : `1px solid ${col.groupColor}`
  const bgTint = `${col.groupColor}08`
  const headerBorder = `border-bottom: 1px solid ${isActive ? col.groupColor : `${col.groupColor}33`};`
  const activeBadge = isActive
    ? '<span style="background: #5ecfbe; color: #12151c; padding: 0 4px; border-radius: 2px; font-size: 9px; font-weight: bold;">ACTIVE</span>'
    : ''
  const stackHtml = col.stack.map(nodeLine).join('\n')
  const railColor = col.rail.status === 'pending' ? MUTED : col.groupColor
  return `    <div style="border: ${border}; border-radius: 6px; padding: 10px; background-color: ${bgTint};${isActive ? ' box-shadow: 0 0 12px rgba(94, 207, 190, 0.15);' : ''}">
      <div style="color: ${col.groupColor}; font-weight: bold; font-size: 11px; margin-bottom: 6px; text-transform: uppercase; ${headerBorder} padding-bottom: 4px; display: flex; justify-content: space-between;"><span>${esc(col.title)}</span>${activeBadge}</div>
      <div style="color: ${railColor}; font-size: 12px; font-weight: bold; margin-bottom: 8px;">${esc(col.rail.label)}</div>
${stackHtml}
    </div>`
}

function artifactTable(report: WorkflowProgressReport): string {
  const rows = report.columns
    .flatMap(col => [col.rail, ...col.stack].map(node => ({ col: col.title.split(' · ')[0] ?? col.title, node })))
    .map(
      ({ col, node }) =>
        `        <tr style="border-bottom: 1px solid ${PANEL_BG};">
          <td style="padding: 6px 0; color: ${STATUS_COLOR[node.status]};">${STATUS_GLYPH[node.status]} ${esc(node.label)}</td>
          <td style="color: ${MUTED};">${esc(col)}</td>
          <td style="color: ${STATUS_COLOR[node.status]};">${node.status}</td>
        </tr>`
    )
    .join('\n')
  return `  <div style="border-top: 1px solid #222936; padding-top: 16px; margin-top: 8px;">
    <span style="color: ${MUTED}; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Artifact Index</span>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px;">
      <thead>
        <tr style="text-align: left; border-bottom: 1px solid #222936; color: ${MUTED};">
          <th style="padding: 6px 0;">Node</th>
          <th>Column</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </div>`
}

/** Render a complete, self-contained HTML document for the report. */
export function renderWorkflowStatusHtml(report: WorkflowProgressReport): string {
  const activeIdx = report.columns.findIndex(
    c => c.rail.status === 'current' || c.stack.some(n => n.status === 'current')
  )
  const columnsHtml = report.columns.map((c, i) => columnBlock(c, i === activeIdx)).join('\n')
  const nextHint = report.next.focusHint ? ` <span style="color: ${MUTED};"># ${esc(report.next.focusHint)}</span>` : ''
  const debtBadge =
    report.artifactDebt.length > 0
      ? ` <span style="background: #f59e0b; color: #12151c; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; margin-left: 8px;">${report.artifactDebt.length} DEBT</span>`
      : ''
  const catalogBadge =
    report.catalogStatus === 'shipped'
      ? ` <span style="color: #5ecfbe; font-size: 11px; margin-left: 8px;">catalog: ${esc(report.catalogKey ?? '?')} · shipped</span>`
      : ''
  const lifecycleNote = report.lifecycleMismatch
    ? ` <span style="color: #f59e0b; font-size: 11px; margin-left: 8px;">⚠ lifecycle mismatch</span>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Spec workflow · ${esc(report.slug)}</title>
</head>
<body style="margin: 0; background-color: ${BG}; color: ${TEXT}; font-family: 'JetBrains Mono', 'DM Sans', ui-monospace, monospace;">
<div style="padding: 24px; box-sizing: border-box;">
  <div style="margin-bottom: 16px;">
    <span style="color: ${TEXT}; font-weight: bold; font-size: 16px;">Spec workflow · ${esc(report.slug)}</span>${debtBadge}${catalogBadge}${lifecycleNote}
    <div style="color: ${MUTED}; font-size: 11px; margin-top: 2px;">${esc(report.featureDir)}</div>
  </div>

  <div style="background-color: #1c2333; border-left: 4px solid #5ecfbe; padding: 12px 16px; margin-bottom: 24px; border-radius: 0 4px 4px 0;">
    <span style="color: #5ecfbe; font-weight: bold;">◉ NEXT:</span>
    <span style="color: ${TEXT}; font-weight: bold;">${esc(report.next.command)}</span>${nextHint}
  </div>

  <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 24px;">
${columnsHtml}
  </div>
${artifactTable(report)}
</div>
</body>
</html>
`
}
