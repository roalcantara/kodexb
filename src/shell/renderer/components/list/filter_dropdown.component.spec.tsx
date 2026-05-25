import { describe, expect, it } from 'bun:test'
import type { ListStats } from '@shared/rpc'
import { render, screen } from '@testing-library/react'

import {
  FILTER_DROPDOWN_PORTAL_MIN_WIDTH_PX,
  FILTER_DROPDOWN_PORTAL_VIEWPORT_HORIZONTAL_MARGIN_PX
} from '../../constants/layout.const'
import { compactFilterPortalBox, FilterDropdown } from './filter_dropdown.component'

const noop = () => undefined

const stats: ListStats = {
  total: 10,
  bookmark: 1,
  command: 1,
  cheat: 1,
  task: 6,
  taskViews: {
    actionable: 1,
    today: 0,
    overdue: 0,
    this_week: 0,
    all_pending: 5,
    all_doing: 0
  },
  tags: { git: 2 },
  byType: { bookmark: 1, command: 1, cheat: 1, task: 6 }
}

describe('FilterDropdown', () => {
  describe('when only bookmark type is selected', () => {
    it('hides Task views', () => {
      render(
        <FilterDropdown
          open
          anchorRect={{ bottom: 40, left: 8, width: 200 } as DOMRect}
          stats={stats}
          types={['bookmark']}
          tags={[]}
          onChange={noop}
          onClose={noop}
        />
      )
      expect(screen.queryByText('Task views')).toBeNull()
    })
  })

  describe('when type filter is empty', () => {
    it('shows Task views', () => {
      render(
        <FilterDropdown
          open
          anchorRect={{ bottom: 40, left: 8, width: 200 } as DOMRect}
          stats={stats}
          types={[]}
          tags={[]}
          onChange={noop}
          onClose={noop}
        />
      )
      expect(screen.getByText('Task views')).toBeTruthy()
    })
  })

  describe('in compact mode', () => {
    it('portals under document.body with clip shell', () => {
      const anchor = { bottom: 48, left: 12, width: 260, top: 8, right: 272, height: 40, x: 12, y: 8 } as DOMRect
      const { unmount } = render(
        <FilterDropdown
          open
          compact
          anchorRect={anchor}
          stats={stats}
          types={[]}
          tags={[]}
          onChange={noop}
          onClose={noop}
        />
      )
      expect(document.body.querySelector('.theme-filter-stack--compact-portal')).toBeTruthy()
      expect(document.body.querySelector('.theme-filter-portal-clip')).toBeTruthy()
      expect(document.body.querySelector('.theme-filter-portal-clip .theme-filter-dropdown')).toBeTruthy()
      unmount()
    })
  })

  describe('compactFilterPortalBox', () => {
    it('centers panel in viewport when unclamped', () => {
      const anchor = { left: 400, bottom: 40, width: 100 } as DOMRect
      const vw = 1000
      const box = compactFilterPortalBox(anchor, vw, 800)
      expect(box.width).toBe(FILTER_DROPDOWN_PORTAL_MIN_WIDTH_PX)
      expect(box.left + box.width / 2).toBeCloseTo(vw / 2, 5)
    })

    it('keeps panel inside viewport when anchor is on the right', () => {
      const anchor = { left: 920, bottom: 44, width: 72 } as DOMRect
      const box = compactFilterPortalBox(anchor, 1000, 800)
      expect(box.left).toBeGreaterThanOrEqual(FILTER_DROPDOWN_PORTAL_VIEWPORT_HORIZONTAL_MARGIN_PX)
      expect(box.left + box.width).toBeLessThanOrEqual(1000 - FILTER_DROPDOWN_PORTAL_VIEWPORT_HORIZONTAL_MARGIN_PX)
      expect(box.width).toBe(FILTER_DROPDOWN_PORTAL_MIN_WIDTH_PX)
    })

    it('respects narrow viewport width cap', () => {
      const anchor = { left: 4, bottom: 40, width: 280 } as DOMRect
      const box = compactFilterPortalBox(anchor, 260, 700)
      expect(box.width).toBeLessThanOrEqual(260 - 24)
      expect(box.left + box.width).toBeLessThanOrEqual(260 - 12)
    })
  })
})
