import { describe, expect, it } from 'bun:test'

describe('governance docs security references', () => {
  it('DoD includes security subgate references', async () => {
    const dod = await Bun.file('assets/guides/DoD.md').text()
    expect(dod).toContain('mise run spec security --strict')
    expect(dod).toContain('spec handoff-scrub')
  })

  it('SDD workflow guide lists security gate and scrub dispatch guard', async () => {
    const guide = await Bun.file('assets/guides/SDD_WORKFLOW_GUIDE.md').text()
    expect(guide).toContain('mise run spec security --strict')
    expect(guide).toContain('spec handoff-scrub')
  })
})
