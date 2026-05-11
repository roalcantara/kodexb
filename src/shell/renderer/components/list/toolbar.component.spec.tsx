/// <reference lib="dom" />

import { expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Toolbar } from './toolbar.component'

test('Toolbar calls onSearchArrowDown from search input', async () => {
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

test('Toolbar Settings button calls onSettings', async () => {
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
