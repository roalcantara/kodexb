import { describe, expect, it } from 'bun:test'
import { useListPageShellOverlays, useListPageShellTaskOps } from './use_list_page_shell_overlays.hook'

describe('useListPageShellOverlays', () => {
  it('exports overlay and task-op hooks', () => {
    expect(typeof useListPageShellOverlays).toBe('function')
    expect(typeof useListPageShellTaskOps).toBe('function')
  })
})
