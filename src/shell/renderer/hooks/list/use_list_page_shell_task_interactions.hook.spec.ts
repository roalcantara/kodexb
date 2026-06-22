import { describe, expect, it } from 'bun:test'
import { useListPageShellTaskInteractions } from './use_list_page_shell_task_interactions.hook'

describe('useListPageShellTaskInteractions', () => {
  it('exports task keyboard/drag wiring', () => {
    expect(typeof useListPageShellTaskInteractions).toBe('function')
  })
})
