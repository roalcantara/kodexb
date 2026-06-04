import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  installEntryActionPanelDepsMock,
  installRecordEntryVisitMock,
  rpcBookmarkRow,
  withMockClipboard
} from '@testing'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

installEntryActionPanelDepsMock()
const recordEntryVisitFireAndForget = installRecordEntryVisitMock()

type HarnessModule = typeof import('../../../../__tests__/helpers/view_navigation.harness.util')

let harness: HarnessModule

describe('useViewNavigation recordEntryVisit', () => {
  beforeAll(async () => {
    harness = await import('../../../../__tests__/helpers/view_navigation.harness.util')
  })

  beforeEach(() => {
    recordEntryVisitFireAndForget.mockReset()
  })

  describe('when advance opens detail from list', () => {
    it('records visit', () => {
      const { ViewNavigationVisitHarness } = harness
      render(<ViewNavigationVisitHarness rows={[rpcBookmarkRow(1), rpcBookmarkRow(2)]} />)
      fireEvent.click(screen.getByTestId('advance'))
      expect(recordEntryVisitFireAndForget).toHaveBeenCalledWith(1)
    })
  })

  describe('when selectDetailEntry targets another row', () => {
    it('records visit for selected entry', () => {
      const { ViewNavigationVisitHarness } = harness
      render(<ViewNavigationVisitHarness rows={[rpcBookmarkRow(1), rpcBookmarkRow(2)]} />)
      fireEvent.click(screen.getByTestId('select-2'))
      expect(recordEntryVisitFireAndForget).toHaveBeenCalledWith(2)
    })
  })

  describe('after successful copy shortcut', () => {
    it('records visit', async () => {
      const { ViewNavigationCopyHarness } = harness
      const actionCtx = {
        entry: null,
        pushToast: () => undefined,
        onEditTask: () => undefined,
        onNewTask: () => undefined,
        onSync: () => undefined,
        onOpenSettings: () => undefined
      }
      const writeText = mock(() => Promise.resolve())
      await withMockClipboard(writeText, async () => {
        render(
          <ViewNavigationCopyHarness
            rows={[rpcBookmarkRow(1)]}
            selectedId={1}
            pushToast={() => undefined}
            actionCtx={actionCtx}
          />
        )
        const surface = screen.getByTestId('surface')
        surface.focus()
        fireEvent.keyDown(surface, { key: 'c', metaKey: true, bubbles: true })
        await waitFor(() => {
          expect(recordEntryVisitFireAndForget).toHaveBeenCalledWith(1)
        })
      })
    })
  })
})
