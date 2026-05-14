import { afterEach, expect } from 'bun:test'
import { cleanup, fireEvent, screen } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

/** List row already selected: first ArrowRight → split; second → detail (`view-state`). */
export function fireTwoRightsExpectSplitThenDetail(surface: HTMLElement): void {
  fireEvent.keyDown(surface, { key: 'ArrowRight' })
  expect(screen.getByTestId('view-state').textContent).toBe('split')
  fireEvent.keyDown(surface, { key: 'ArrowRight' })
  expect(screen.getByTestId('view-state').textContent).toBe('detail')
}
