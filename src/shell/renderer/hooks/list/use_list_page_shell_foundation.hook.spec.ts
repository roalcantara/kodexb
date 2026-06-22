import { describe, expect, it } from 'bun:test'
import { useListPageShellFoundation } from './use_list_page_shell_foundation.hook'

describe('useListPageShellFoundation', () => {
  it('exports foundation wiring for useListPageShell', () => {
    expect(typeof useListPageShellFoundation).toBe('function')
  })
})
