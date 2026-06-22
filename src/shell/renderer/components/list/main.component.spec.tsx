// @list_navigation
import { describe, expect, it } from 'bun:test'
import { render } from '@testing-library/react'

import { defaultEntryActionPanelDeps } from '../../actions/panel/deps.service'
import { EMPTY_TAG_COUNTS, ListMain } from './main.component'

const shellStub = {
  data: {
    rows: [],
    stats: { total: 0, tags: {}, types: {} },
    search: '',
    setSearch: () => undefined,
    debouncedSearch: '',
    types: [],
    tags: [],
    taskView: undefined,
    setTypes: () => undefined,
    setTags: () => undefined,
    setTaskView: () => undefined,
    pageSize: 50,
    setPageSize: () => undefined,
    hasMore: false,
    loading: false,
    matchTotal: 0,
    syncing: false,
    refreshList: async () => undefined,
    onSync: () => undefined,
    syncUi: {
      open: false,
      phase: 'preparing' as const,
      sourcesDir: '',
      totalFiles: 0,
      processed: 0,
      fileLog: [],
      summary: null,
      failMessage: null
    },
    dismissSyncModal: () => undefined,
    syncInfo: null,
    dbStats: null
  },
  filter: {
    filterOpen: false,
    filterButtonRef: { current: null },
    setFilterOpen: () => undefined,
    openFilter: () => undefined,
    anchorRect: null
  },
  sel: {
    selectedId: null,
    detailEntry: null,
    viewState: 'list' as const,
    setSelectedId: () => undefined,
    closeToList: () => undefined,
    selectDetailEntry: () => undefined,
    selectFirst: () => undefined,
    handleKey: () => undefined,
    onListKeyDown: () => undefined
  },
  palette: { open: false, actions: [], openPalette: () => undefined, closePalette: () => undefined, actionCtx: {} },
  quickLookup: { open: false, search: '', setSearch: () => undefined, closeOverlay: () => undefined },
  actionCtx: {
    entry: null,
    pushToast: () => undefined,
    onEditTask: () => undefined,
    onNewTask: () => undefined,
    onSync: () => undefined
  },
  entryPanelDeps: defaultEntryActionPanelDeps()
}

describe('ListMain', () => {
  describe('EMPTY_TAG_COUNTS', () => {
    it('is a stable reference across calls', () => {
      expect(Object.is(EMPTY_TAG_COUNTS, EMPTY_TAG_COUNTS)).toBe(true)
    })

    it('is frozen', () => {
      expect(Object.isFrozen(EMPTY_TAG_COUNTS)).toBe(true)
    })
  })

  describe('when rendering list chrome', () => {
    it('does not mount quick-actions toolbar', () => {
      const { container } = render(
        <ListMain
          listData={shellStub.data as never}
          listFilter={shellStub.filter as never}
          listSelection={shellStub.sel as never}
          listOverlays={
            {
              taskSheet: { taskSheetVisible: false, taskSheetEntry: null, onCloseTaskSheet: () => undefined },
              palette: shellStub.palette,
              quickLookup: shellStub.quickLookup
            } as never
          }
          listActions={
            {
              handlers: {
                onListKeyDown: () => undefined,
                handleWindowModL: () => undefined,
                onSearchArrowDown: () => undefined,
                onListSurfaceKeyDown: () => undefined,
                onFilterChange: () => undefined,
                onNewTask: () => undefined,
                onEditTask: () => undefined
              },
              refs: {
                searchInputRef: { current: null },
                listSurfaceRef: { current: null },
                listSentinelRef: { current: null }
              },
              flags: { emptyDb: false, noResults: false, emptyList: false },
              dragDrop: undefined,
              actionCtx: shellStub.actionCtx,
              entryPanelDeps: shellStub.entryPanelDeps,
              actionToasts: [],
              dismissActionToast: () => undefined,
              pushToast: () => undefined,
              mutationError: null,
              clearMutationError: () => undefined
            } as never
          }
          showSettings={false}
          setShowSettings={() => undefined}
        />
      )
      expect(container.querySelector('.cmp-toolbar--quick-actions')).toBeNull()
    })
  })
})
