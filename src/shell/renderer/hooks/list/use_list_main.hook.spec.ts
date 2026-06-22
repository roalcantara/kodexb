import { describe, expect, it } from 'bun:test'
import { useListMain } from './use_list_main.hook'

describe('useListMain', () => {
  it('exports the list main view-model hook', () => {
    expect(typeof useListMain).toBe('function')
  })
})
