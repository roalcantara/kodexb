import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { EntryRowFrecencyIndicator } from './entry_row_frecency_indicator.component'

describe('EntryRowFrecencyIndicator', () => {
  describe('when score is zero', () => {
    it('hides the indicator', () => {
      const { container } = render(<EntryRowFrecencyIndicator frecencyScore={0} visitCount={0} maxFrecencyScore={5} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('when visited', () => {
    it('shows usage label', () => {
      render(<EntryRowFrecencyIndicator frecencyScore={4} visitCount={3} maxFrecencyScore={4} />)
      expect(screen.getByLabelText('Used 3 times')).toBeTruthy()
    })
  })
})
