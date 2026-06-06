import { describe, expect, it } from 'bun:test'
import { extractMatches, POLICY_EXCEPTION_FILES, scanLine, scanText, summarize } from './rogue_refs.script.ts'

describe('rogue_refs.script', () => {
  it('extractMatches finds assets/docs paths', () => {
    const line = 'See [design](assets/docs/specs/001-foundation/design.md) and `assets/docs/specs/e2e/requirements.md`.'
    expect(extractMatches(line)).toEqual([
      'assets/docs/specs/001-foundation/design.md',
      'assets/docs/specs/e2e/requirements.md'
    ])
  })

  it('scanLine marks DOC_AUTHORITY as policy exception', () => {
    expect(POLICY_EXCEPTION_FILES.has('assets/guides/DOC_AUTHORITY.md')).toBe(true)
    const hits = scanLine('assets/guides/DOC_AUTHORITY.md', 10, 'Legacy SDD archaeology: assets/docs/specs/NNN-slug/')
    expect(hits).toHaveLength(1)
    expect(hits[0]?.policyException).toBe(true)
  })

  it('scanText counts actionable hits in agent entry docs', () => {
    const hits = scanText('README.md', 'Normative: assets/docs/specs/foundation/design.md\n')
    expect(hits).toHaveLength(1)
    expect(hits[0]?.policyException).toBe(false)
  })

  it('summarize groups actionable hits by file', () => {
    const hits = scanText('CLAUDE.md', 'a assets/docs/specs/a.md\nb assets/docs/specs/b.md\n')
    const { actionable, byFile } = summarize(hits)
    expect(actionable).toHaveLength(2)
    expect(byFile.get('CLAUDE.md')).toHaveLength(2)
  })
})
