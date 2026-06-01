import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'

const listBindingsMock = mock(() => Promise.resolve([]))
const noopUnsubscribe = (): undefined => undefined
const onAfterSyncMock = mock(() => noopUnsubscribe)

mock.module('../../rpc/client', () => ({
  listBindings: listBindingsMock,
  onAfterSyncComplete: onAfterSyncMock,
  getConfig: () => Promise.resolve({ display: { advisories: false } }),
  recordBindingVisit: () => Promise.resolve()
}))

const { QuickLookupOverlay } = await import('./quick_lookup_overlay.component')

const onChange = mock<(v: string) => void>()
const onClose = mock<() => void>()

beforeEach(() => {
  onChange.mockReset()
  onClose.mockReset()
})

describe('QuickLookupOverlay', () => {
  afterEach(cleanup)

  it('renders nothing when closed', () => {
    const { container } = render(
      <QuickLookupOverlay open={false} search="" onSearchChange={onChange} onClose={onClose} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders the search input when open', () => {
    render(<QuickLookupOverlay open={true} search="" onSearchChange={onChange} onClose={onClose} />)
    expect(screen.getByPlaceholderText('Search bindings or type a chord...')).toBeTruthy()
  })
})
