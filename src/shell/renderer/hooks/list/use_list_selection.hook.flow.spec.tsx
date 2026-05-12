/// <reference lib="dom" />

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useListSelection } from './use_list_selection.hook'

function HookHarness() {
  const sel = useListSelection(
    [
      { type: 'bookmark', id: 1, key: 'react', source: 't.yml', desc: 'React docs', tags: [], doc: '', createdAt: 0, updatedAt: 0 },
      { type: 'command', id: 2, key: 'git log', source: 't.yml', desc: 'Git log', tags: [], doc: '', createdAt: 0, updatedAt: 0 },
      { type: 'task', id: 3, key: 'build app', source: 't.yml', desc: 'Build it', tags: [], doc: '', status: 'todo', createdAt: 0, updatedAt: 0 }
    ] as any
  )
  return (
    <div onKeyDown={sel.handleGlobalKeyDown}>
      <div tabIndex={0} data-testid="surface" onKeyDown={sel.onListKeyDown} role="listbox">
        <span data-testid="sel">{sel.selectedId ?? 'null'}</span>
        <span data-testid="det">{sel.detailEntry?.id ?? 'null'}</span>
        <input data-testid="input" placeholder="Search" />
      </div>
    </div>
  )
}

describe('Navigation flow integration', () => {
  beforeEach(() => {
    render(<HookHarness />)
    screen.getByTestId('surface').focus()
  })

  // Helper: dispatch native keyboard event on surface — bubbles to global handler via React
  function press(key: string, opts?: KeyboardEventInit) {
    const surface = screen.getByTestId('surface')
    act(() => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts })
      surface.dispatchEvent(event)
    })
  }

  describe('ArrowRight / ArrowLeft cycle', () => {
    it('ArrowDown selects first, ArrowRight opens detail, ArrowLeft closes, ArrowRight reopens', () => {
      // Select first entry
      fireEvent.keyDown(screen.getByTestId('surface'), { key: 'ArrowDown' })
      expect(screen.getByTestId('sel').textContent).not.toBe('null')

      // Open detail
      press('ArrowRight')
      expect(screen.getByTestId('det').textContent).not.toBe('null')

      // Close detail
      press('ArrowLeft')
      expect(screen.getByTestId('det').textContent).toBe('null')

      // Re-open detail — the exact bug scenario
      press('ArrowRight')
      expect(screen.getByTestId('det').textContent).not.toBe('null')
    })
  })

  describe('ArrowRight / Escape cycle', () => {
    it('ArrowRight opens, Escape closes, ArrowRight reopens, Escape closes', () => {
      fireEvent.keyDown(screen.getByTestId('surface'), { key: 'ArrowDown' })
      expect(screen.getByTestId('sel').textContent).not.toBe('null')

      press('ArrowRight')
      expect(screen.getByTestId('det').textContent).not.toBe('null')

      press('Escape')
      expect(screen.getByTestId('det').textContent).toBe('null')

      press('ArrowRight')
      expect(screen.getByTestId('det').textContent).not.toBe('null')

      press('Escape')
      expect(screen.getByTestId('det').textContent).toBe('null')
    })
  })

  describe('ArrowRight auto-selects first', () => {
    it('opens detail even when no row is selected', () => {
      expect(screen.getByTestId('sel').textContent).toBe('null')

      press('ArrowRight')
      expect(screen.getByTestId('det').textContent).not.toBe('null')
      expect(screen.getByTestId('sel').textContent).not.toBe('null')
    })
  })

  describe('Enter advances through stages', () => {
    it('list → split → detail → no-op', () => {
      fireEvent.keyDown(screen.getByTestId('surface'), { key: 'ArrowDown' })

      press('Enter')
      expect(screen.getByTestId('det').textContent).not.toBe('null') // split
      expect(screen.getByTestId('det').textContent).toBe(screen.getByTestId('sel').textContent)

      press('Enter')
      expect(screen.getByTestId('det').textContent).not.toBe('null') // detail — still has detailEntry
    })
  })

  describe('Global handler ignores inputs', () => {
    it('does not advance when typing in search input', () => {
      const input = screen.getByTestId('input')
      input.focus()
      // Simulate typing 'r' — should NOT trigger ArrowRight behavior
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }))
      // No state change expected — just verify no crash
      expect(screen.getByTestId('det').textContent).toBe('null')
    })
  })

  describe('Meta+[ / Ctrl+[ closes detail', () => {
    it('Meta+[ retreats when detail is open', () => {
      fireEvent.keyDown(screen.getByTestId('surface'), { key: 'ArrowDown' })
      press('ArrowRight')
      expect(screen.getByTestId('det').textContent).not.toBe('null')

      press('[', { metaKey: true })
      expect(screen.getByTestId('det').textContent).toBe('null')
    })

    it('Ctrl+[ retreats when detail is open', () => {
      fireEvent.keyDown(screen.getByTestId('surface'), { key: 'ArrowDown' })
      press('ArrowRight')
      expect(screen.getByTestId('det').textContent).not.toBe('null')

      press('[', { ctrlKey: true })
      expect(screen.getByTestId('det').textContent).toBe('null')
    })
  })
})
