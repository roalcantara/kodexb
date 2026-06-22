// @sync_ui
import { describe, expect, it, mock } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'

import { SyncToast } from './sync_toast.component'

const success = {
  filesProcessed: 10,
  inserted: 3,
  updated: 7,
  errors: [] as string[],
  warnings: [] as string[],
  fileLog: []
}
const withErrors = {
  filesProcessed: 5,
  inserted: 1,
  updated: 2,
  errors: ['bad.yml: parse error', 'other.yml: validation'],
  warnings: [] as string[],
  fileLog: []
}

const NOOP = () => {
  /* noop */
}
const FILES_REGEX = /files/
describe('SyncToast', () => {
  describe('when result is null', () => {
    it('renders nothing', () => {
      render(<SyncToast result={null} onDismiss={NOOP} />)
      expect(screen.queryByText(FILES_REGEX)).toBeNull()
    })
  })

  describe('with a success result', () => {
    it('shows success summary', () => {
      render(<SyncToast result={success} onDismiss={NOOP} />)
      expect(screen.getByText('10 files: 3 inserted, 7 updated')).toBeTruthy()
    })
  })

  describe('with errors', () => {
    it('shows error summary and toggle', () => {
      render(<SyncToast result={withErrors} onDismiss={NOOP} />)
      expect(screen.getByText('Sync completed with 2 errors')).toBeTruthy()
      expect(screen.getByText('View errors (2)')).toBeTruthy()
    })

    it('expands error list on toggle click', () => {
      render(<SyncToast result={withErrors} onDismiss={NOOP} />)
      fireEvent.click(screen.getByText('View errors (2)'))
      expect(screen.getByText('bad.yml: parse error')).toBeTruthy()
    })
  })

  describe('when dismiss is clicked', () => {
    it('calls onDismiss', () => {
      const onDismiss = mock(NOOP)
      render(<SyncToast result={success} onDismiss={onDismiss} />)
      fireEvent.click(screen.getByLabelText('Dismiss'))
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })
})
