// @list_navigation
import { describe, expect, it } from 'bun:test'
import { render } from '@testing-library/react'

import { defaultEntryActionPanelDeps } from '../../actions/entry_action_panel_deps.util'
import { ListMain, EMPTY_TAG_COUNTS } from './list_main.component'

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
  onListKeyDown: () => undefined,
  handleWindowModL: () => undefined,
  flags: { emptyDb: false, noResults: false, emptyList: false },
  listSurfaceRef: { current: null },
  listSentinelRef: { current: null },
  searchInputRef: { current: null },
  onSearchArrowDown: () => undefined,
  onListSurfaceKeyDown: () => undefined,
  onFilterChange: () => undefined,
  taskSheetVisible: false,
  taskSheetEntry: null,
  onNewTask: () => undefined,
  onEditTask: () => undefined,
  onCloseTaskSheet: () => undefined,
  dragDrop: undefined,
  palette: { open: false, actions: [], openPalette: () => undefined, closePalette: () => undefined, actionCtx: {} },
  quickLookup: { open: false, search: '', setSearch: () => undefined, closeOverlay: () => undefined },
  actionCtx: {
    entry: null,
    pushToast: () => undefined,
    onEditTask: () => undefined,
    onNewTask: () => undefined,
    onSync: () => undefined
  },
  entryPanelDeps: defaultEntryActionPanelDeps(),
  actionToasts: [],
  dismissActionToast: () => undefined,
  pushToast: () => undefined
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
        <ListMain p={shellStub as never} showSettings={false} setShowSettings={() => undefined} />
      )
      expect(container.querySelector('.cmp-toolbar--quick-actions')).toBeNull()
    })
  })
})
