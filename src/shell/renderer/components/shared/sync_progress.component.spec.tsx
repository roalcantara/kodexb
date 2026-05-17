/// <reference lib="dom" />

import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'

import { SyncProgress } from './sync_progress.component'

describe('SyncProgress', () => {
  describe('with processed and total', () => {
    it('renders progress bar with correct values', () => {
      render(<SyncProgress processed={3} total={10} />)
      const bar = screen.getByRole('progressbar') as HTMLProgressElement
      expect(bar.value).toBe(3)
      expect(bar.max).toBe(10)
    })

    it('shows processing file label', () => {
      render(<SyncProgress processed={5} total={12} />)
      expect(screen.getByText('Processing file 5 of 12')).toBeTruthy()
    })
  })
})
