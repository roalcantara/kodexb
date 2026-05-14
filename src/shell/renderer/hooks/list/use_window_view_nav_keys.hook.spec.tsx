/// <reference lib="dom" />

import { expect, test } from 'bun:test'
import { act, render, waitFor } from '@testing-library/react'
import { useState } from 'react'

import { useWindowViewNavKeys } from './use_window_view_nav_keys.hook'

function Harness({ disabled }: { disabled: boolean }) {
  const [hits, setHits] = useState(0)
  useWindowViewNavKeys({
    disabled,
    handleKey: e => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setHits(h => h + 1)
      }
    }
  })
  return <span data-testid="hits">{hits}</span>
}

test('window capture invokes handleKey for ArrowLeft when not disabled', async () => {
  render(<Harness disabled={false} />)
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
  })
  await waitFor(() => {
    expect(document.querySelector('[data-testid="hits"]')?.textContent).toBe('1')
  })
})

test('window capture does not invoke handleKey when disabled', async () => {
  render(<Harness disabled />)
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
  })
  await new Promise(r => setTimeout(r, 20))
  expect(document.querySelector('[data-testid="hits"]')?.textContent).toBe('0')
})
