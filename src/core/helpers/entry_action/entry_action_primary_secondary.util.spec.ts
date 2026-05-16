import { describe, expect, test } from 'bun:test'
import { primaryActionIdForEntryType, secondaryActionIdForEntryType } from './entry_action_primary_secondary.util'

describe('entry action ranks by type', () => {
  test('primary ids', () => {
    expect(primaryActionIdForEntryType('bookmark')).toBe('open-url')
    expect(primaryActionIdForEntryType('command')).toBe('paste-terminal')
    expect(primaryActionIdForEntryType('cheat')).toBe('copy')
    expect(primaryActionIdForEntryType('task')).toBe('edit-task')
  })

  test('secondary ids', () => {
    expect(secondaryActionIdForEntryType('bookmark')).toBe('copy')
    expect(secondaryActionIdForEntryType('command')).toBe('copy')
    expect(secondaryActionIdForEntryType('cheat')).toBe('open-editor')
    expect(secondaryActionIdForEntryType('task')).toBe('cycle-status')
  })
})
