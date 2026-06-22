import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ListOverlayHosts } from './overlay_hosts.component'

afterEach(() => {
  cleanup()
})

describe('ListOverlayHosts', () => {
  describe('when action toasts are present', () => {
    it('renders them', () => {
      render(
        <ListOverlayHosts
          listData={
            {
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
            } as never
          }
          listOverlays={
            {
              taskSheet: { taskSheetVisible: false, taskSheetEntry: null, onCloseTaskSheet: () => undefined },
              palette: {
                open: false,
                actions: [],
                openPalette: () => undefined,
                closePalette: () => undefined,
                actionCtx: null
              },
              quickLookup: {
                open: false,
                search: '',
                setSearch: () => undefined,
                closeOverlay: () => undefined,
                openOverlay: () => undefined,
                highlightIndex: 0,
                setHighlightIndex: () => undefined,
                searchInputRef: { current: null },
                resultRows: []
              }
            } as never
          }
          listActions={
            {
              handlers: {} as never,
              refs: {} as never,
              flags: { emptyDb: false, noResults: false, emptyList: false },
              dragDrop: undefined,
              actionCtx: {} as never,
              entryPanelDeps: {} as never,
              pushToast: () => undefined,
              mutationError: null,
              clearMutationError: () => undefined,
              actionToasts: [{ id: 1, message: 'Saved', type: 'success' }],
              dismissActionToast: () => undefined
            } as never
          }
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
          listData={
            {
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
            } as never
          }
          listOverlays={
            {
              taskSheet: { taskSheetVisible: false, taskSheetEntry: null, onCloseTaskSheet: () => undefined },
              palette: {
                open: false,
                actions: [],
                openPalette: () => undefined,
                closePalette: () => undefined,
                actionCtx: null
              },
              quickLookup: {
                open: false,
                search: '',
                setSearch: () => undefined,
                closeOverlay: () => undefined,
                openOverlay: () => undefined,
                highlightIndex: 0,
                setHighlightIndex: () => undefined,
                searchInputRef: { current: null },
                resultRows: []
              }
            } as never
          }
          listActions={
            {
              handlers: {} as never,
              refs: {} as never,
              flags: { emptyDb: false, noResults: false, emptyList: false },
              dragDrop: undefined,
              actionCtx: {} as never,
              entryPanelDeps: {} as never,
              pushToast: () => undefined,
              mutationError: null,
              clearMutationError: () => undefined,
              actionToasts: [{ id: 7, message: 'Done', type: 'success' }],
              dismissActionToast: (id: number) => {
                dismissed = id
              }
            } as never
          }
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
