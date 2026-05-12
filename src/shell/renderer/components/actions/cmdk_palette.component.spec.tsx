/// <reference lib="dom" />
import { expect, mock, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type CmdkAction, CmdkPalette } from './cmdk_palette.component'

const noop = () => undefined

function makeAction(id: string, label: string): CmdkAction {
  return { id, label, handler: mock(noop) }
}

test('renders nothing when closed', () => {
  render(<CmdkPalette open={false} actions={[]} onClose={noop} />)
  expect(screen.queryByPlaceholderText('Type an action...')).toBeNull()
})

test('renders actions when open', () => {
  const actions = [makeAction('a', 'Action A'), makeAction('b', 'Action B')]
  render(<CmdkPalette open={true} actions={actions} onClose={noop} />)
  expect(screen.getByText('Action A')).toBeTruthy()
  expect(screen.getByText('Action B')).toBeTruthy()
})

test('filters actions by search text', async () => {
  const actions = [makeAction('open', 'Open URL'), makeAction('copy', 'Copy Title')]
  render(<CmdkPalette open={true} actions={actions} onClose={noop} />)
  const input = screen.getByPlaceholderText('Type an action...')
  await userEvent.type(input, 'copy')
  expect(screen.queryByText('Open URL')).toBeNull()
  expect(screen.getByText('Copy Title')).toBeTruthy()
})

test('shows empty state when no actions match', async () => {
  render(<CmdkPalette open={true} actions={[makeAction('a', 'Action')]} onClose={noop} />)
  const input = screen.getByPlaceholderText('Type an action...')
  await userEvent.type(input, 'zzz')
  expect(screen.getByText('No matching actions')).toBeTruthy()
})

test('calls handler and closes on Enter', () => {
  const handler = mock(noop)
  const onClose = mock(noop)
  const actions = [{ id: 'test', label: 'Test', handler }]
  render(<CmdkPalette open={true} actions={actions} onClose={onClose} />)
  fireEvent.keyDown(screen.getByPlaceholderText('Type an action...'), { key: 'Enter' })
  expect(handler).toHaveBeenCalledTimes(1)
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('closes on Escape', () => {
  const onClose = mock(noop)
  render(<CmdkPalette open={true} actions={[]} onClose={onClose} />)
  fireEvent.keyDown(screen.getByPlaceholderText('Type an action...'), { key: 'Escape' })
  expect(onClose).toHaveBeenCalledTimes(1)
})
