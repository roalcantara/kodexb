import { describe, expect, it } from 'bun:test'
import { useListPageShellScroll } from './use_list_page_shell_scroll.hook'

describe('useListPageShellScroll', () => {
  it('exports scroll/pagination wiring', () => {
    expect(typeof useListPageShellScroll).toBe('function')
  })
})
