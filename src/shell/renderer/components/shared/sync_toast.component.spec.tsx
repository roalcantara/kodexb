/// <reference lib="dom" />

import { expect, mock, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'

import { SyncToast } from './sync_toast.component'

const success = { filesProcessed: 10, inserted: 3, updated: 7, errors: [] as string[] }
const withErrors = {
  filesProcessed: 5,
  inserted: 1,
  updated: 2,
  errors: ['bad.yml: parse error', 'other.yml: validation']
}

const NOOP = () => {
  /* noop */
}
const FILES_REGEX = /files/

test('renders nothing when result is null', () => {
  render(<SyncToast result={null} onDismiss={NOOP} />)
  expect(screen.queryByText(FILES_REGEX)).toBeNull()
})

test('shows success summary', () => {
  render(<SyncToast result={success} onDismiss={NOOP} />)
  expect(screen.getByText('10 files: 3 inserted, 7 updated')).toBeTruthy()
})

test('shows error summary and toggle', () => {
  render(<SyncToast result={withErrors} onDismiss={NOOP} />)
  expect(screen.getByText('Sync completed with 2 errors')).toBeTruthy()
  expect(screen.getByText('View errors (2)')).toBeTruthy()
})

test('toggle expands error list', () => {
  render(<SyncToast result={withErrors} onDismiss={NOOP} />)
  fireEvent.click(screen.getByText('View errors (2)'))
  expect(screen.getByText('bad.yml: parse error')).toBeTruthy()
})

test('dismiss button calls onDismiss', () => {
  const onDismiss = mock(NOOP)
  render(<SyncToast result={success} onDismiss={onDismiss} />)
  fireEvent.click(screen.getByLabelText('Dismiss'))
  expect(onDismiss).toHaveBeenCalledTimes(1)
})
