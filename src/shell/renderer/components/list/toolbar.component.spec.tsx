import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Toolbar } from './toolbar.component'

describe('Toolbar', () => {
  describe('when navigating from search input', () => {
    it('calls onSearchArrowDown on ArrowDown', async () => {
      let called = 0
      render(
        <Toolbar
          search=""
          onSearchChange={() => undefined}
          onSearchArrowDown={() => {
            called += 1
          }}
          onFilterClick={() => undefined}
          filterLabel="All"
          resultCount={1}
          onSync={() => undefined}
          syncing={false}
        />
      )
      screen.getByRole('searchbox').focus()
      await userEvent.keyboard('{ArrowDown}')
      expect(called).toBe(1)
    })
  })

  describe('when Settings button is clicked', () => {
    it('calls onSettings', async () => {
      let settingsClicks = 0
      render(
        <Toolbar
          search=""
          onSearchChange={() => undefined}
          onFilterClick={() => undefined}
          filterLabel="All"
          resultCount={1}
          onSync={() => undefined}
          syncing={false}
          onSettings={() => {
            settingsClicks += 1
          }}
        />
      )
      await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
      expect(settingsClicks).toBe(1)
    })
  })
})
