import { describe, expect, it } from 'bun:test'
import { ENTRY_TYPE_VALUES } from './entry_type.const'

describe('ENTRY_TYPE_VALUES', () => {
  it('lists the five entry types in canonical order', () => {
    expect(ENTRY_TYPE_VALUES).toEqual(['bookmark', 'command', 'cheat', 'task', 'shortcut'])
  })
})
