import { describe, expect, it } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing'
import { render, screen } from '@testing-library/react'

import { defaultEntryActionPanelDeps } from '../../actions/entry_action_panel_deps.util'
import { ListFooter } from './list_footer.component'

const commandEntry = factoryFor('command', {
  overrides: { id: 1, key: 'brew install mise', desc: 'Install mise', tags: ['brew'] }
}) as RpcKnowledge

const PASTE_IN_TERMINAL_RE = /Paste in Terminal/i
const ACTIONS_RE = /Actions/i

describe('ListFooter', () => {
  describe('when rendering status text', () => {
    it('shows footer status', () => {
      render(
        <ListFooter
          footerStatus="10 of 50"
          isFullDetail={false}
          detailEntry={null}
          closeDetailToList={() => undefined}
          viewState="list"
          selectedId={1}
          rows={[commandEntry]}
          actionCtx={{
            entry: null,
            pushToast: () => undefined,
            onEditTask: () => undefined,
            onNewTask: () => undefined,
            onSync: () => undefined,
            onOpenSettings: () => undefined
          }}
          entryPanelDeps={defaultEntryActionPanelDeps()}
          onOpenPalette={() => undefined}
        />
      )
      expect(screen.getByText('10 of 50')).toBeTruthy()
    })
  })

  describe('when a command row is selected', () => {
    it('shows Raycast primary action without static shortcut inventory', () => {
      const { container } = render(
        <ListFooter
          footerStatus="done"
          isFullDetail={false}
          detailEntry={null}
          closeDetailToList={() => undefined}
          viewState="list"
          selectedId={1}
          rows={[commandEntry]}
          actionCtx={{
            entry: null,
            pushToast: () => undefined,
            onEditTask: () => undefined,
            onNewTask: () => undefined,
            onSync: () => undefined,
            onOpenSettings: () => undefined
          }}
          entryPanelDeps={defaultEntryActionPanelDeps()}
          onOpenPalette={() => undefined}
        />
      )
      expect(screen.getByRole('button', { name: PASTE_IN_TERMINAL_RE })).toBeTruthy()
      expect(screen.getByRole('button', { name: ACTIONS_RE })).toBeTruthy()
      expect(container.querySelector('.cmp-footer-actions-raycast')).toBeTruthy()
      expect(container.querySelector('.cmp-footer-shortcuts')).toBeNull()
    })
  })
})
