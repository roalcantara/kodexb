import { afterEach, describe, expect, it } from 'bun:test'
import type { ListStats } from '@shared/rpc'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { ListSearchFilterChrome } from './list_search_filter_chrome.component'

afterEach(() => {
  cleanup()
})

const emptyTaskViews = { actionable: 0, today: 0, overdue: 0, this_week: 0, all_pending: 0, all_doing: 0 }
const stats: ListStats = {
  total: 1,
  bookmark: 1,
  command: 0,
  cheat: 0,
  task: 0,
  taskViews: emptyTaskViews,
  tags: {},
  byType: { bookmark: 1, command: 0, cheat: 0, task: 0 }
}

function renderChrome(overrides: Partial<Parameters<typeof ListSearchFilterChrome>[0]> = {}) {
  const props: Parameters<typeof ListSearchFilterChrome>[0] = {
    isFullDetail: false,
    showBackWithSearch: false,
    closeDetailToList: () => undefined,
    searchInputRef: createRef<HTMLInputElement>(),
    search: '',
    onSearchChange: () => undefined,
    onSearchArrowDown: () => undefined,
    filterButtonRef: createRef<HTMLButtonElement>(),
    filterChipCls: 'theme-filter-chip',
    filterSummary: 'All entries',
    onToggleFilter: () => undefined,
    filterOpen: false,
    stats,
    types: [],
    tags: [],
    taskView: undefined,
    onFilterChange: () => undefined,
    onFilterClose: () => undefined,
    pushToast: () => undefined,
    anchorRect: null,
    ...overrides
  }

  return render(<ListSearchFilterChrome {...props} />)
}
describe('ListSearchFilterChrome', () => {
  describe('when search text changes', () => {
    it('updates search value', () => {
      let value = ''
      renderChrome({
        onSearchChange: next => {
          value = next
        }
      })

      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'bun' } })
      expect(value).toBe('bun')
    })
  })

  describe('when back button is clicked', () => {
    it('returns from split detail', async () => {
      let closed = false
      renderChrome({
        showBackWithSearch: true,
        closeDetailToList: () => {
          closed = true
        }
      })

      await userEvent.click(screen.getByRole('button', { name: 'Back to list' }))
      expect(closed).toBe(true)
    })
  })

  describe('when in full detail', () => {
    it('renders drag stripe', () => {
      const { container } = renderChrome({ isFullDetail: true })
      expect(container.querySelector('.theme-window-drag-stripe--detail')).toBeTruthy()
    })
  })
})
