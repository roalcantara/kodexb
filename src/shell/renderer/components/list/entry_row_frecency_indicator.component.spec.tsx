import { expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { EntryRowFrecencyIndicator } from './entry_row_frecency_indicator.component'

test('EntryRowFrecencyIndicator is hidden when score is zero', () => {
  const { container } = render(<EntryRowFrecencyIndicator frecencyScore={0} visitCount={0} maxFrecencyScore={5} />)
  expect(container.firstChild).toBeNull()
})

test('EntryRowFrecencyIndicator shows usage label when visited', () => {
  render(<EntryRowFrecencyIndicator frecencyScore={4} visitCount={3} maxFrecencyScore={4} />)
  expect(screen.getByLabelText('Used 3 times')).toBeTruthy()
})
