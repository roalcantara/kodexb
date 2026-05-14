/// <reference lib="dom" />
import { expect, mock, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommandPalette, type CommandPaletteAction } from './command_palette.component'

const noop = () => undefined

function makeAction(
  id: string,
  label: string,
  section: CommandPaletteAction['section'] = 'library'
): CommandPaletteAction {
  return { id, label, section, handler: mock(noop) }
}

test('renders nothing when closed', () => {
  render(<CommandPalette open={false} actions={[]} onClose={noop} />)
  expect(screen.queryByPlaceholderText('Type an action...')).toBeNull()
})

test('renders actions when open', () => {
  const actions = [makeAction('a', 'Action A'), makeAction('b', 'Action B')]
  render(<CommandPalette open={true} actions={actions} onClose={noop} />)
  expect(screen.getByText('Action A')).toBeTruthy()
  expect(screen.getByText('Action B')).toBeTruthy()
})

test('renders section headers when section changes between actions', () => {
  const actions = [
    makeAction('e', 'Paste', 'entry'),
    makeAction('c', 'Copy', 'clipboard'),
    makeAction('s', 'Sync', 'library')
  ]
  render(<CommandPalette open={true} actions={actions} onClose={noop} />)
  expect(screen.getByText('This entry')).toBeTruthy()
  expect(screen.getByText('Clipboard')).toBeTruthy()
  expect(screen.getByText('Library')).toBeTruthy()
})

test('global-only palette shows Library then App section labels', () => {
  const actions = [
    makeAction('sync', 'Sync', 'library'),
    makeAction('new', 'New Task', 'library'),
    makeAction('quit', 'Quit kb', 'app')
  ]
  render(<CommandPalette open={true} actions={actions} onClose={noop} />)
  expect(screen.getByText('Library')).toBeTruthy()
  expect(screen.getByText('App')).toBeTruthy()
})

test('filters actions by search text', async () => {
  const actions = [makeAction('open', 'Open URL', 'entry'), makeAction('copy', 'Copy', 'clipboard')]
  render(<CommandPalette open={true} actions={actions} onClose={noop} />)
  const input = screen.getByPlaceholderText('Type an action...')
  await userEvent.type(input, 'copy')
  expect(screen.queryByText('Open URL')).toBeNull()
  expect(screen.getByText('Copy')).toBeTruthy()
})

test('shows empty state when no actions match', async () => {
  render(<CommandPalette open={true} actions={[makeAction('a', 'Action')]} onClose={noop} />)
  const input = screen.getByPlaceholderText('Type an action...')
  await userEvent.type(input, 'zzz')
  expect(screen.getByText('No matching actions')).toBeTruthy()
})

test('calls handler and closes on Enter', () => {
  const handler = mock(noop)
  const onClose = mock(noop)
  const actions = [{ id: 'test', label: 'Test', section: 'library' as const, handler }]
  render(<CommandPalette open={true} actions={actions} onClose={onClose} />)
  fireEvent.keyDown(screen.getByPlaceholderText('Type an action...'), { key: 'Enter' })
  expect(handler).toHaveBeenCalledTimes(1)
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('closes on Escape', () => {
  const onClose = mock(noop)
  render(<CommandPalette open={true} actions={[]} onClose={onClose} />)
  fireEvent.keyDown(screen.getByPlaceholderText('Type an action...'), { key: 'Escape' })
  expect(onClose).toHaveBeenCalledTimes(1)
})
