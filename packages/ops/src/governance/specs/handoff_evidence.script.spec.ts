import { describe, expect, it } from 'bun:test'
import { collectHandoffEvidenceRuns } from './handoff_evidence.script'

const HANDOFF = `# Handoff

| ID | Done when | Evidence |
| --- | --- | --- |
| COH-1 AC1 | logging merged | \`bun test src/shared/logging\` |
| COH-2 AC1 | operator check | Operator smoke below |
| COH-3 AC1 | gate green | \`mise run spec gate\` |
`

describe('collectHandoffEvidenceRuns', () => {
  it('extracts backtick commands and skips operator smoke by default', () => {
    const runs = collectHandoffEvidenceRuns(HANDOFF)
    expect(runs.map(r => r.command)).toEqual(['bun test src/shared/logging', 'mise run spec gate'])
    expect(runs.every(r => !r.operatorSmoke)).toBe(true)
  })

  it('includes operator smoke when requested', () => {
    const runs = collectHandoffEvidenceRuns(HANDOFF, { includeOperatorSmoke: true })
    expect(runs).toHaveLength(2)
  })
})
