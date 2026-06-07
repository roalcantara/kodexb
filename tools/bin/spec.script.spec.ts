import { describe, expect, it } from 'bun:test'
import { ALLOWED_WORKFLOW_NAMES, validateWorkflowName } from './spec.script.ts'

describe('spec.script', () => {
  it('exports a dispatch entrypoint module', async () => {
    const mod = await import('./spec.script.ts')
    expect(typeof mod).toBe('object')
  })
})

describe('validateWorkflowName', () => {
  it('returns null for the registered orchestrated-handoff workflow', () => {
    expect(validateWorkflowName('orchestrated-handoff')).toBeNull()
  })

  it('rejects speckit — it is the default workflow and not dispatched through `spec workflow`', () => {
    const err = validateWorkflowName('speckit')
    expect(err).not.toBeNull()
    expect(err).toContain('unknown workflow')
    expect(err).toContain('speckit')
    expect(err).toContain('orchestrated-handoff')
  })

  it('rejects any other unknown name with a helpful list of allowed names', () => {
    const err = validateWorkflowName('orchestrated-sliced')
    expect(err).not.toBeNull()
    expect(err).toContain('unknown workflow')
    expect(err).toContain('orchestrated-sliced')
    for (const allowed of ALLOWED_WORKFLOW_NAMES) {
      expect(err).toContain(allowed)
    }
  })

  it('accepts empty string — mise expands the positional even when the operator omits it; caller decides the default', () => {
    expect(validateWorkflowName('')).toBeNull()
  })
})
