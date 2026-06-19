import { describe, expect, it } from 'bun:test'
import { checkProfileGuideCrossref } from './profile_guide_crossref.script'

describe('profile_guide_crossref', () => {
  it('exports checkProfileGuideCrossref', () => {
    expect(typeof checkProfileGuideCrossref).toBe('function')
  })

  it('passes on current tree', () => {
    const findings = checkProfileGuideCrossref(
      'assets/catalog/workflows/default.yaml',
      'assets/guides/SECURITY_GUIDE.md'
    )
    expect(findings.length).toBe(0)
  })

  it('returns error when profile not found', () => {
    const findings = checkProfileGuideCrossref('/nonexistent.yaml', '/nonexistent.md')
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0]?.severity).toBe('error')
  })
})
