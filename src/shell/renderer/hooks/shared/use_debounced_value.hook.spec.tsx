/// <reference lib="dom" />

import { describe, expect, it } from 'bun:test'
import { act, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'

import { useDebouncedValue } from './use_debounced_value.hook'

describe('useDebouncedValue', () => {
  function Probe({ value, delayMs }: { value: string; delayMs: number }) {
    const debounced = useDebouncedValue(value, delayMs)
    return <span data-testid="debounced">{debounced}</span>
  }

  function ControlledProbe() {
    const [value, setValue] = useState('a')
    const debounced = useDebouncedValue(value, 40)
    return (
      <div>
        <span data-testid="debounced">{debounced}</span>
        <button type="button" onClick={() => setValue('b')}>
          set-b
        </button>
      </div>
    )
  }

  describe('with a single value update', () => {
    it('mirrors value after delay', async () => {
      const { rerender } = render(<Probe value="x" delayMs={40} />)
      expect(screen.getByTestId('debounced').textContent).toBe('x')
      rerender(<Probe value="y" delayMs={40} />)
      expect(screen.getByTestId('debounced').textContent).toBe('x')
      await waitFor(() => expect(screen.getByTestId('debounced').textContent).toBe('y'), { timeout: 500 })
    })
  })

  describe('with rapid changes', () => {
    it('resets timer on each change', async () => {
      render(<ControlledProbe />)
      expect(screen.getByTestId('debounced').textContent).toBe('a')
      await act(() => {
        screen.getByRole('button', { name: 'set-b' }).click()
      })
      expect(screen.getByTestId('debounced').textContent).toBe('a')
      await waitFor(() => expect(screen.getByTestId('debounced').textContent).toBe('b'), { timeout: 500 })
    })
  })
})
