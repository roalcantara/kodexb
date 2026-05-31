import { describe, expect, it } from 'bun:test'
import { primaryActionIdForEntryType, secondaryActionIdForEntryType } from './entry_action_primary_secondary.util'

describe('entry action ranks by type', () => {
  it('primary ids', () => {
    expect(primaryActionIdForEntryType('bookmark')).toBe('open-url')
    expect(primaryActionIdForEntryType('command')).toBe('paste-terminal')
    expect(primaryActionIdForEntryType('cheat')).toBe('paste-doc')
    expect(primaryActionIdForEntryType('task')).toBe('edit-task')
  })

  it('secondary ids', () => {
    expect(secondaryActionIdForEntryType('bookmark')).toBeNull()
    expect(secondaryActionIdForEntryType('command')).toBe('run-terminal')
    expect(secondaryActionIdForEntryType('cheat')).toBeNull()
    expect(secondaryActionIdForEntryType('task')).toBe('cycle-status')
  })
})
