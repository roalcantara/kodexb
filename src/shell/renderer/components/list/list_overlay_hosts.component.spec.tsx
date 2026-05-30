import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ListPageShell } from '../../hooks/list/use_list_page_shell.hook'
import { ListOverlayHosts } from './list_overlay_hosts.component'

afterEach(() => {
  cleanup()
})

function shell(overrides: Partial<ListPageShell> = {}) {
  return {
    taskSheetVisible: false,
    taskSheetEntry: null,
    onCloseTaskSheet: () => undefined,
    data: {
      syncUi: {
        open: false,
        phase: 'preparing',
        sourcesDir: '',
        totalFiles: 0,
        processed: 0,
        fileLog: [],
        summary: null,
        failMessage: null
      },
      dismissSyncModal: () => undefined,
      setPageSize: () => undefined,
      refreshList: () => Promise.resolve()
    },
    palette: {
      open: false,
      actions: [],
      closePalette: () => undefined
    },
    quickLookup: {
      open: false,
      search: '',
      setSearch: () => undefined,
      closeOverlay: () => undefined,
      openOverlay: () => undefined,
      highlightIndex: 0,
      setHighlightIndex: () => undefined,
      resultRows: [],
      searchInputRef: { current: null }
    },
    actionToasts: [],
    dismissActionToast: () => undefined,
    ...overrides
  } as unknown as ListPageShell
}
describe('ListOverlayHosts', () => {
  describe('when action toasts are present', () => {
    it('renders them', () => {
      render(
        <ListOverlayHosts
          p={shell({ actionToasts: [{ id: 1, message: 'Saved', type: 'success' }] } as Partial<ListPageShell>)}
          showSettings={false}
          setShowSettings={() => undefined}
          focusMainSearch={() => undefined}
        />
      )

      expect(screen.getByText('Saved')).toBeTruthy()
    })

    it('dismisses on button click', async () => {
      let dismissed = 0
      render(
        <ListOverlayHosts
          p={shell({
            actionToasts: [{ id: 7, message: 'Done', type: 'success' }],
            dismissActionToast: id => {
              dismissed = id
            }
          } as Partial<ListPageShell>)}
          showSettings={false}
          setShowSettings={() => undefined}
          focusMainSearch={() => undefined}
        />
      )

      await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
      expect(dismissed).toBe(7)
    })
  })
})
