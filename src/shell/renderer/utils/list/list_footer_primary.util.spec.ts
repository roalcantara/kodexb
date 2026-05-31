import { describe, expect, it } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing'

import { defaultEntryActionPanelDeps } from '../../actions/entry_action_panel_deps.util'
import { resolveListFooterPrimary } from './list_footer_primary.util'

describe('list_footer_primary.util', () => {
  describe('resolveListFooterPrimary', () => {
    it('returns Paste in Terminal for selected command row', () => {
      const entry = factoryFor('command', {
        overrides: { id: 7, key: 'brew install mise', desc: 'Install mise', tags: ['brew'] }
      }) as RpcKnowledge
      const { action } = resolveListFooterPrimary({
        viewState: 'list',
        selectedId: 7,
        detailEntry: null,
        rows: [entry],
        actionCtx: {
          entry: null,
          pushToast: () => undefined,
          onEditTask: () => undefined,
          onNewTask: () => undefined,
          onSync: () => undefined
        },
        entryPanelDeps: defaultEntryActionPanelDeps()
      })
      expect(action?.label).toBe('Paste in Terminal')
    })
  })
})
