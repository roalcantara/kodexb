import { describe, expect, it } from 'bun:test'
import { parseSpecAcceptanceCriteria, renderHandoffFromSpec, requirementBlocks } from './spec_parse.script'

const SAMPLE = `# Demo

## REQUIREMENT COH-1: Logging

**User story:** As a dev, I want logs.

1. WHEN COH-1 lands, THEN the RPC plugins SHALL merge into one file.
   - **Measure:** file count
   - **Evidence:** \`bun test src/shared/logging\`

2. WHEN the barrel is updated, THEN exports SHALL stay identical.
   - **Measure:** typecheck
   - **Evidence:** \`bun run typecheck\`
`

describe('requirementBlocks', () => {
  it('splits REQUIREMENT sections with ids', () => {
    const blocks = requirementBlocks(SAMPLE.split('\n'))
    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.id).toBe('COH-1')
  })
})

describe('parseSpecAcceptanceCriteria', () => {
  it('extracts AC rows with evidence commands', () => {
    const rows = parseSpecAcceptanceCriteria(SAMPLE)
    expect(rows).toHaveLength(2)
    expect(rows[0]?.handoffId).toBe('COH-1 AC1')
    expect(rows[0]?.evidence).toBe('bun test src/shared/logging')
    expect(rows[1]?.handoffId).toBe('COH-1 AC2')
  })
})

describe('renderHandoffFromSpec', () => {
  it('renders a handoff table header and rows', () => {
    const md = renderHandoffFromSpec(SAMPLE, '017-demo')
    expect(md).toContain('| ID | Done when | Evidence |')
    expect(md).toContain('COH-1 AC1')
    expect(md).toContain('bun test src/shared/logging')
  })
})
