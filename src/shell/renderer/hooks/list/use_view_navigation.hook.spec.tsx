/// <reference lib="dom" />

import { expect, mock, test } from 'bun:test'
import {
  expectViewState,
  fireArrowKey,
  fireTwoRightsExpectSplitThenDetail,
  renderViewNavSurfaceFocused,
  ViewNavigationCopyHarness,
  ViewNavigationDesyncHarness,
  ViewNavigationHarness,
  ViewNavigationSearchHarness,
  viewNavBookmarkRow
} from '@testing'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { withMockClipboard } from '../../actions/entry_action_spec_setup.util'

test('handleKey follows arbitrary split/detail ladder from list surface', () => {
  const surface = renderViewNavSurfaceFocused([viewNavBookmarkRow(1)])

  fireArrowKey(surface, 'ArrowRight')
  expectViewState('split')
  expect(screen.getByTestId('detail-id').textContent).toBe('1')

  fireArrowKey(surface, 'ArrowLeft')
  expectViewState('list')
  expect(screen.getByTestId('detail-id').textContent).toBe('null')

  fireTwoRightsExpectSplitThenDetail(surface)
  expect(screen.getByTestId('detail-id').textContent).toBe('1')

  const ladder: Array<{ key: 'ArrowLeft' | 'ArrowRight'; state: string; detail?: string }> = [
    { key: 'ArrowLeft', state: 'split' },
    { key: 'ArrowRight', state: 'detail' },
    { key: 'ArrowRight', state: 'split' },
    { key: 'ArrowRight', state: 'detail' },
    { key: 'ArrowLeft', state: 'split' },
    { key: 'ArrowLeft', state: 'list', detail: 'null' }
  ]
  for (const step of ladder) {
    fireArrowKey(surface, step.key)
    expectViewState(step.state)
    if (step.detail !== undefined) {
      expect(screen.getByTestId('detail-id').textContent).toBe(step.detail)
    }
  }
})

test('handleKey on shell continues ladder when shell is focused', () => {
  render(<ViewNavigationHarness rows={[viewNavBookmarkRow(1)]} />)
  const surface = screen.getByTestId('surface')
  const shell = screen.getByTestId('shell')

  surface.focus()
  fireArrowKey(surface, 'ArrowRight')
  fireArrowKey(surface, 'ArrowRight')
  expectViewState('detail')

  shell.focus()
  expect(document.activeElement).toBe(shell)
  fireArrowKey(shell, 'ArrowLeft')
  expectViewState('split')

  fireArrowKey(shell, 'ArrowLeft')
  expectViewState('list')
})

test('selectDetailEntry advances reducer when list+detail were desynced', () => {
  render(<ViewNavigationDesyncHarness rows={[viewNavBookmarkRow(1), viewNavBookmarkRow(2)]} />)
  expectViewState('list')
  expect(screen.getByTestId('detail-id').textContent).toBe('1')
  fireEvent.click(screen.getByTestId('pick-2'))
  expectViewState('split')
  expect(screen.getByTestId('detail-id').textContent).toBe('2')
})

test('selectDetailEntry from split keeps split and updates detail row', () => {
  render(<ViewNavigationDesyncHarness rows={[viewNavBookmarkRow(1), viewNavBookmarkRow(2)]} />)
  const surface = screen.getByTestId('surface')
  surface.focus()
  fireArrowKey(surface, 'ArrowRight')
  expectViewState('split')
  fireEvent.click(screen.getByTestId('pick-2'))
  expectViewState('split')
  expect(screen.getByTestId('detail-id').textContent).toBe('2')
})

test('⌘L focuses search and selects all when search is mounted', () => {
  render(<ViewNavigationSearchHarness rows={[viewNavBookmarkRow(1)]} />)
  const surface = screen.getByTestId('surface')
  const search = screen.getByTestId('search') as HTMLInputElement
  surface.focus()
  fireEvent.keyDown(surface, { key: 'l', metaKey: true, bubbles: true })
  expect(document.activeElement).toBe(search)
  expect(search.selectionStart).toBe(0)
  expect(search.selectionEnd).toBe(5)
})

test('⌘L from full detail retreats to split then focuses search', async () => {
  render(<ViewNavigationSearchHarness rows={[viewNavBookmarkRow(1)]} />)
  const surface = screen.getByTestId('surface')
  surface.focus()
  fireArrowKey(surface, 'ArrowRight')
  fireArrowKey(surface, 'ArrowRight')
  expectViewState('detail')
  expect(screen.queryByTestId('search')).toBeNull()

  fireEvent.keyDown(surface, { key: 'l', metaKey: true, bubbles: true })
  expectViewState('split')

  await waitFor(
    () => {
      const search = screen.getByTestId('search') as HTMLInputElement
      expect(document.activeElement).toBe(search)
      expect(search.selectionStart).toBe(0)
      expect(search.selectionEnd).toBe(5)
    },
    { timeout: 5000 }
  )
})

test('Escape from search moves focus to list surface', () => {
  render(<ViewNavigationSearchHarness rows={[viewNavBookmarkRow(1)]} />)
  const search = screen.getByTestId('search')
  const surface = screen.getByTestId('surface')
  search.focus()
  fireEvent.keyDown(search, { key: 'Escape', bubbles: true })
  expect(document.activeElement).toBe(surface)
})

test('Escape from search uses injected onEscapeFromSearch when provided', () => {
  const onEscape = mock(() => undefined)
  render(<ViewNavigationSearchHarness rows={[viewNavBookmarkRow(1)]} onEscapeFromSearch={onEscape} />)
  const search = screen.getByTestId('search')
  search.focus()
  fireEvent.keyDown(search, { key: 'Escape', bubbles: true })
  expect(onEscape).toHaveBeenCalledTimes(1)
})

test('Escape from list surface calls hideWindow when detail is closed', () => {
  const hide = mock(() => undefined)
  render(<ViewNavigationSearchHarness rows={[viewNavBookmarkRow(1)]} hideWindow={hide} />)
  const surface = screen.getByTestId('surface')
  surface.focus()
  fireEvent.keyDown(surface, { key: 'Escape', bubbles: true })
  expect(hide).toHaveBeenCalledTimes(1)
})

test('⌘C with no selection shows toast', () => {
  const pushToast = mock(() => undefined)
  render(<ViewNavigationCopyHarness rows={[viewNavBookmarkRow(1)]} selectedId={null} pushToast={pushToast} />)
  const surface = screen.getByTestId('surface')
  surface.focus()
  fireEvent.keyDown(surface, { key: 'c', metaKey: true, bubbles: true })
  expect(pushToast).toHaveBeenCalledWith('Select an entry to copy', 'success')
})

test('⌘C with selection copies and shows success toast', async () => {
  const pushToast = mock(() => undefined)
  const writeText = mock(() => Promise.resolve())
  await withMockClipboard(writeText, async () => {
    render(<ViewNavigationCopyHarness rows={[viewNavBookmarkRow(1)]} selectedId={1} pushToast={pushToast} />)
    const surface = screen.getByTestId('surface')
    surface.focus()
    fireEvent.keyDown(surface, { key: 'c', metaKey: true, bubbles: true })
    expect(writeText).toHaveBeenCalled()
    await waitFor(() => {
      expect(pushToast).toHaveBeenCalledWith(`'k1' copied to clipboard`, 'success')
    })
  })
})
