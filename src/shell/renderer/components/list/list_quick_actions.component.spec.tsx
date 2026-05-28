import { describe, expect, it, mock } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { ListQuickActions } from './list_quick_actions.component'

const SYNC_RE = /Sync/

describe('ListQuickActions', () => {
  it('renders sync, new task, and settings controls', () => {
    render(
      <ListQuickActions
        syncButtonRef={createRef()}
        newTaskButtonRef={createRef()}
        settingsButtonRef={createRef()}
        syncing={false}
        onSync={mock(() => undefined)}
        onNewTask={mock(() => undefined)}
        onOpenSettings={mock(() => undefined)}
      />
    )
    expect(screen.getByRole('button', { name: SYNC_RE })).toBeTruthy()
    expect(screen.getByRole('button', { name: '+ New Task' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy()
  })
})
