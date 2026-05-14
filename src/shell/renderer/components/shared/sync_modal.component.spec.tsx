/// <reference lib="dom" />

import { expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { SyncModal } from './sync_modal.component'

test('SyncModal renders nothing when closed', () => {
  const { container } = render(
    <SyncModal
      model={{
        open: false,
        phase: 'preparing',
        sourcesDir: '',
        totalFiles: 0,
        processed: 0,
        fileLog: [],
        summary: null,
        failMessage: null
      }}
      onDismiss={() => undefined}
    />
  )
  expect(container.firstChild).toBeNull()
})

test('SyncModal shows preparing copy when phase is preparing', () => {
  render(
    <SyncModal
      model={{
        open: true,
        phase: 'preparing',
        sourcesDir: '',
        totalFiles: 0,
        processed: 0,
        fileLog: [],
        summary: null,
        failMessage: null
      }}
      onDismiss={() => undefined}
    />
  )
  expect(screen.getByText('Reading source folder…')).toBeTruthy()
})
