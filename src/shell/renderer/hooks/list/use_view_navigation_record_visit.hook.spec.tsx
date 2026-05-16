/// <reference lib="dom" />

import { beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { rpcBookmarkRow } from '../../../../__tests__/helpers/rpc_knowledge_test_row.util'
import {
  installEntryActionPanelDepsMock,
  installRecordEntryVisitMock,
  withMockClipboard
} from '../../actions/entry_action_spec_setup.util'

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

  test('records visit when advance opens detail from list', () => {
    const { ViewNavigationVisitHarness } = harness
    render(<ViewNavigationVisitHarness rows={[rpcBookmarkRow(1), rpcBookmarkRow(2)]} />)
    fireEvent.click(screen.getByTestId('advance'))
    expect(recordEntryVisitFireAndForget).toHaveBeenCalledWith(1)
  })

  test('records visit when selectDetailEntry targets another row', () => {
    const { ViewNavigationVisitHarness } = harness
    render(<ViewNavigationVisitHarness rows={[rpcBookmarkRow(1), rpcBookmarkRow(2)]} />)
    fireEvent.click(screen.getByTestId('select-2'))
    expect(recordEntryVisitFireAndForget).toHaveBeenCalledWith(2)
  })

  test('records visit after successful copy shortcut', async () => {
    const { ViewNavigationCopyHarness } = harness
    const actionCtx = {
      entry: null,
      pushToast: () => undefined,
      onEditTask: () => undefined,
      onNewTask: () => undefined,
      onSync: () => undefined
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
