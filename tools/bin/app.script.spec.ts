import { describe, expect, it } from 'bun:test'
import { gateSteps, selectGates } from './app.script.ts'

describe('selectGates', () => {
  const cases = [
    {
      name: 'neither flag runs both (default-dual, rule 07)',
      q: false,
      p: false,
      want: { quality: true, policy: true }
    },
    { name: 'quality only', q: true, p: false, want: { quality: true, policy: false } },
    { name: 'policy only', q: false, p: true, want: { quality: false, policy: true } },
    { name: 'both flags run both', q: true, p: true, want: { quality: true, policy: true } }
  ]
  for (const { name, q, p, want } of cases) {
    it(name, () => {
      expect(selectGates(q, p)).toEqual(want)
    })
  }
})

describe('gateSteps', () => {
  it('default-dual yields quality then policy steps', () => {
    const steps = gateSteps({ quality: true, policy: true })
    expect(steps.map(s => s.id)).toEqual(['quality', 'policy'])
  })

  it('quality-only yields a single quality step', () => {
    const steps = gateSteps({ quality: true, policy: false })
    expect(steps).toHaveLength(1)
  })

  it('every step carries a command argv (gum spin capable)', () => {
    for (const step of gateSteps({ quality: true, policy: true })) {
      expect(Array.isArray(step.command) && step.command.length > 0).toBe(true)
    }
  })
})
