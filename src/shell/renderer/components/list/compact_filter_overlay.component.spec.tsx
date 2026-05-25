import { describe, expect, it } from 'bun:test'
import type { ListStats, TaskView } from '@shared/rpc'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { sampleListStats } from '../../../../__tests__/fixtures/list_stats.fixture'
import { CompactFilterOverlay } from './compact_filter_overlay.component'
import type { EntryTypeOption } from './filter_dropdown.component'

const noop = () => undefined
const stats = sampleListStats()

function renderOverlay(
  props: Partial<{
    stats: ListStats
    types: EntryTypeOption[]
    tags: string[]
  }> = {}
) {
  render(
    <CompactFilterOverlay
      stats={props.stats ?? stats}
      types={props.types ?? []}
      tags={props.tags ?? []}
      onChange={noop}
      onClose={noop}
    />
  )
}

const LIST_SVG_RE = /list\.svg/
const HASH_AI_OPTION_RE = /^#ai/
const ALL_ENTRIES_OPTION_RE = /^All entries/
const BOOKMARK_OPTION_RE = /^Bookmark,/

describe('CompactFilterOverlay', () => {
  describe('with search input', () => {
    it('shows filter search', () => {
      renderOverlay()
      expect(screen.getByPlaceholderText('Search filters…')).toBeTruthy()
    })

    it('accepts typed text', async () => {
      const user = userEvent.setup()
      renderOverlay()
      const input = screen.getByPlaceholderText('Search filters…')
      await user.type(input, 'ruby')
      expect((input as HTMLInputElement).value).toBe('ruby')
    })

    it('filters tag options by substring', async () => {
      const user = userEvent.setup()
      const statsWithTags: ListStats = {
        ...stats,
        tags: { ai: 1, zebra: 2 }
      }
      renderOverlay({ stats: statsWithTags, types: ['bookmark'] })
      await user.type(screen.getByPlaceholderText('Search filters…'), 'zebra')
      expect(screen.queryByRole('option', { name: HASH_AI_OPTION_RE })).toBeNull()
    })

    it('allows Tab to toggle highlighted option', async () => {
      const user = userEvent.setup()
      let lastTags: string[] = []
      const onChange = (next: { types: EntryTypeOption[]; tags: string[]; taskView?: TaskView }) => {
        lastTags = next.tags
      }
      const statsWithTags: ListStats = { ...stats, tags: { brew: 2 } }
      render(<CompactFilterOverlay stats={statsWithTags} types={[]} tags={[]} onChange={onChange} onClose={noop} />)
      await user.type(screen.getByPlaceholderText('Search filters…'), 'brew')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Tab}')
      expect(lastTags).toEqual(['brew'])
    })
  })

  describe('when navigating with arrow keys', () => {
    function renderBrewTagOverlay() {
      const user = userEvent.setup()
      const statsWithTags: ListStats = { ...stats, tags: { brew: 1 } }
      renderOverlay({ stats: statsWithTags })
      return {
        user,
        input: screen.getByPlaceholderText('Search filters…'),
        allOption: screen.getByRole('option', { name: ALL_ENTRIES_OPTION_RE })
      }
    }

    it('ArrowUp from first row moves focus to search', async () => {
      const { user, input, allOption } = renderBrewTagOverlay()
      await user.click(allOption)
      await user.keyboard('{ArrowUp}')
      expect(document.activeElement).toBe(input)
    })

    it('ArrowDown from search after ArrowUp keeps focus in search', async () => {
      const { user, input, allOption } = renderBrewTagOverlay()
      await user.click(allOption)
      await user.keyboard('{ArrowUp}')
      await user.keyboard('{ArrowDown}')
      expect(document.activeElement).toBe(input)
      expect(allOption.className).toContain('kb-pt-filter-option--highlight')
    })
  })

  describe('when highlighting rows', () => {
    it('marks All row selected when no filters', () => {
      renderOverlay()
      const allOption = screen.getByRole('option', { name: new RegExp(`^All entries, ${stats.total} matches$`) })
      expect(allOption.className).toContain('kb-pt-filter-option--selected')
      expect(allOption.className).toContain('kb-pt-filter-option--highlight')
    })

    it('highlights active facet row when type filter is on', () => {
      renderOverlay({ types: ['bookmark'] })
      const bookmarkOption = screen.getByRole('option', { name: BOOKMARK_OPTION_RE })
      expect(bookmarkOption.className).toContain('kb-pt-filter-option--selected')
      expect(bookmarkOption.className).toContain('kb-pt-filter-option--highlight')
    })

    it('shows list icon on All row', () => {
      renderOverlay()
      const allOption = screen.getByRole('option', { name: new RegExp(`^All entries, ${stats.total} matches$`) })
      const img = allOption.querySelector('img')
      expect(img?.getAttribute('src')).toMatch(LIST_SVG_RE)
    })

    it('does not mark All selected when type filter is on', () => {
      renderOverlay({ types: ['bookmark'] })
      const allOption = screen.getByRole('option', { name: new RegExp(`^All entries, ${stats.total} matches$`) })
      expect(allOption.className).not.toContain('kb-pt-filter-option--selected')
    })
  })

  describe('when rendering sections', () => {
    it('shows Quick and Task views section headings', () => {
      renderOverlay()
      expect(screen.getByText('Quick')).toBeTruthy()
      expect(screen.getByText('Task views')).toBeTruthy()
    })

    it('places Close outside scroll root', () => {
      renderOverlay()
      const scrollRoot = document.querySelector('[data-compact-filter-scroll-root]')
      const close = screen.getByRole('button', { name: 'Close' })
      expect(scrollRoot).toBeTruthy()
      expect(scrollRoot?.contains(close)).toBe(false)
    })

    it('places Types and Quick inside scroll root', () => {
      renderOverlay()
      const scrollRoot = document.querySelector('[data-compact-filter-scroll-root]')
      expect(scrollRoot?.contains(screen.getByText('Types'))).toBe(true)
      expect(scrollRoot?.contains(screen.getByText('Quick'))).toBe(true)
    })
  })

  describe('with task views', () => {
    it('adds task-views section for tiled icons', () => {
      renderOverlay()
      expect(document.querySelector('.kb-pt-filter-section-block--task-views')).toBeTruthy()
    })

    it('omits task-views section when type filter hides task views', () => {
      renderOverlay({ types: ['bookmark'] })
      expect(document.querySelector('.kb-pt-filter-section-block--task-views')).toBeNull()
    })
  })
})
