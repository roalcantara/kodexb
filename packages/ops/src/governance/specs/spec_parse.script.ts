/**
 * Shared EARS spec.md parsing for lint and audit fix scaffolding.
 */

export type RequirementBlock = {
  id: string | null
  start: number
  body: string[]
}

export type SpecAcceptanceCriterion = {
  requirementId: string
  acNumber: number
  handoffId: string
  doneWhen: string
  evidence: string
}

const EARS_ID = /^##\s+REQUIREMENT\s+([A-Z]{2,}-\d+)\s*:/
const ANY_REQUIREMENT = /^##\s+REQUIREMENT\b/
const AC_LINE = /^\s*(\d+)\.\s+WHEN\b/i
const THEN_CLAUSE = /\bTHEN\b(.+?)(?:\.|$)/i
const EVIDENCE_LINE = /^\s*-\s*\*\*Evidence:\*\*\s*(.+)\s*$/

/** Split spec.md lines into REQUIREMENT blocks (with or without EARS id). */
export function requirementBlocks(lines: string[]): RequirementBlock[] {
  const blocks: RequirementBlock[] = []
  let current: RequirementBlock | null = null
  lines.forEach((raw, i) => {
    const m = raw.match(EARS_ID)
    if (ANY_REQUIREMENT.test(raw)) {
      if (current) blocks.push(current)
      current = { id: m?.[1] ?? null, start: i + 1, body: [] }
      return
    }
    if (current) current.body.push(raw)
  })
  if (current) blocks.push(current)
  return blocks
}

function shortenDoneWhen(thenText: string, maxLen = 120): string {
  const trimmed = thenText.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= maxLen) return trimmed
  return `${trimmed.slice(0, maxLen - 1)}…`
}

function extractThenFromAcLine(acLine: string): string {
  const m = acLine.match(THEN_CLAUSE)
  if (m?.[1]) return shortenDoneWhen(m[1])
  return shortenDoneWhen(acLine.replace(/^\s*\d+\.\s+WHEN\b/i, 'WHEN').trim())
}

function extractEvidenceFromWindow(windowLines: string[]): string {
  for (const raw of windowLines) {
    const m = raw.match(EVIDENCE_LINE)
    if (!m?.[1]) continue
    const text = m[1].trim()
    const backtick = text.match(/^`([^`]+)`/)
    if (backtick?.[1]) return backtick[1].trim()
    return text
  }
  return 'bun test'
}

/** Parse numbered WHEN acceptance criteria from EARS requirement blocks. */
export function parseSpecAcceptanceCriteria(specText: string): SpecAcceptanceCriterion[] {
  const lines = specText.split('\n')
  const blocks = requirementBlocks(lines).filter(b => b.id !== null)
  const out: SpecAcceptanceCriterion[] = []

  for (const block of blocks) {
    const reqId = block.id as string
    block.body.forEach((raw, j) => {
      const acMatch = raw.match(AC_LINE)
      if (!acMatch?.[1]) return
      const acNumber = Number.parseInt(acMatch[1], 10)
      const window = block.body.slice(j, j + 8)
      out.push({
        requirementId: reqId,
        acNumber,
        handoffId: `${reqId} AC${acNumber}`,
        doneWhen: extractThenFromAcLine(raw),
        evidence: extractEvidenceFromWindow(window)
      })
    })
  }
  return out
}

/** Render handoff.md AC table rows from spec.md content. */
export function renderHandoffFromSpec(specText: string, featureFolder: string): string {
  const rows = parseSpecAcceptanceCriteria(specText)
  const tableRows =
    rows.length > 0
      ? rows.map(r => `| ${r.handoffId} | ${r.doneWhen} | \`${r.evidence}\` |`).join('\n')
      : '| TBD AC1 | Requirement satisfied | `bun test` |'

  return `# Handoff — \`${featureFolder}\`

**Spec:** [spec.md](./spec.md)

| ID | Done when | Evidence |
| --- | --- | --- |
${tableRows}
`
}
