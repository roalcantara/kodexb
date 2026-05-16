import { afterEach, expect } from 'bun:test'
import { cleanup, fireEvent, screen } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

/** List row already selected: first ArrowRight → split; second → detail (`view-state`). */
export function fireTwoRightsExpectSplitThenDetail(surface: HTMLElement): void {
  fireArrowKey(surface, 'ArrowRight')
  expectViewState('split')
  fireArrowKey(surface, 'ArrowRight')
  expectViewState('detail')
}

export function expectViewState(expected: string): void {
  expect(screen.getByTestId('view-state').textContent).toBe(expected)
}

export function fireArrowKey(surface: HTMLElement, key: 'ArrowLeft' | 'ArrowRight'): void {
  fireEvent.keyDown(surface, { key })
}
