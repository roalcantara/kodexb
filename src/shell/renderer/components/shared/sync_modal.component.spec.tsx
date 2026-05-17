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

const PROGRESS_LABEL = '5 / 10 processed'

test('SyncModal shows progress when active', () => {
  render(
    <SyncModal
      model={{
        open: true,
        phase: 'active',
        sourcesDir: '/tmp/src',
        totalFiles: 10,
        processed: 5,
        fileLog: [{ path: 'a.yaml', label: 'A', ok: true, inserted: 1, updated: 0, error: '' }],
        summary: null,
        failMessage: null
      }}
      onDismiss={() => undefined}
    />
  )
  expect(screen.getByText(PROGRESS_LABEL)).toBeTruthy()
})

test('SyncModal shows completion summary', () => {
  render(
    <SyncModal
      model={{
        open: true,
        phase: 'done',
        sourcesDir: '/tmp/src',
        totalFiles: 3,
        processed: 3,
        fileLog: [],
        summary: { filesProcessed: 3, inserted: 5, updated: 2, errors: [] },
        failMessage: null
      }}
      onDismiss={() => undefined}
    />
  )
  expect(screen.getByText('Sync finished')).toBeTruthy()
})

test('SyncModal shows failure message', () => {
  render(
    <SyncModal
      model={{
        open: true,
        phase: 'failed',
        sourcesDir: '/tmp/src',
        totalFiles: 0,
        processed: 0,
        fileLog: [],
        summary: null,
        failMessage: 'Permission denied'
      }}
      onDismiss={() => undefined}
    />
  )
  expect(screen.getByText('Permission denied')).toBeTruthy()
})
