import { describe, expect, it, mock } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { OverlayModal } from './overlay_modal.component'

describe('OverlayModal', () => {
  it('renders children and calls onClose on Escape', () => {
    const onClose = mock(() => undefined)
    render(
      <OverlayModal onClose={onClose} title="Test overlay">
        <p>Body</p>
      </OverlayModal>
    )
    expect(screen.getByText('Body')).toBeTruthy()
    screen.getByRole('dialog').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onClose).toHaveBeenCalled()
  })
})
