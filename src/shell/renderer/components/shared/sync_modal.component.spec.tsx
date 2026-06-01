import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { SyncModal, type SyncModalModel } from './sync_modal.component'

const baseModel: SyncModalModel = {
  open: false,
  phase: 'preparing',
  sourcesDir: '',
  totalFiles: 0,
  processed: 0,
  fileLog: [],
  summary: null,
  failMessage: null
}

function renderSyncModal(model: SyncModalModel) {
  return render(<SyncModal model={model} onDismiss={() => undefined} />)
}

function makeFileLog(path: string, label: string, ok: boolean, inserted = 0, updated = 0, error = '') {
  return { path, label, ok, inserted, updated, error }
}

describe('SyncModal', () => {
  describe('when closed', () => {
    it('renders nothing', () => {
      const { container } = renderSyncModal(baseModel)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('when phase is preparing', () => {
    it('shows preparing copy', () => {
      renderSyncModal({ ...baseModel, open: true, phase: 'preparing' })
      expect(screen.getByText('Reading source folder…')).toBeTruthy()
    })
  })

  describe('when phase is active', () => {
    it('shows progress', () => {
      renderSyncModal({
        ...baseModel,
        open: true,
        phase: 'active',
        sourcesDir: '/tmp/src',
        totalFiles: 10,
        processed: 5,
        fileLog: [makeFileLog('a.yaml', 'A', true, 1, 0)]
      })
      expect(screen.getByText('5 / 10 processed')).toBeTruthy()
    })
  })

  describe('when phase is done', () => {
    it('shows completion summary', () => {
      renderSyncModal({
        ...baseModel,
        open: true,
        phase: 'done',
        sourcesDir: '/tmp/src',
        totalFiles: 3,
        processed: 3,
        summary: { filesProcessed: 3, inserted: 5, updated: 2, errors: [], warnings: [] }
      })
      expect(screen.getByText('Sync finished')).toBeTruthy()
    })

    it('lists collision warnings', () => {
      renderSyncModal({
        ...baseModel,
        open: true,
        phase: 'done',
        sourcesDir: '/tmp/src',
        totalFiles: 3,
        processed: 3,
        summary: {
          filesProcessed: 3,
          inserted: 5,
          updated: 2,
          errors: [],
          warnings: ['hard collision: cmd+space between app-a and app-b (A / B)']
        }
      })
      expect(screen.getByText('hard collision: cmd+space between app-a and app-b (A / B)')).toBeTruthy()
    })
  })

  describe('when phase is failed', () => {
    it('shows failure message', () => {
      renderSyncModal({
        ...baseModel,
        open: true,
        phase: 'failed',
        sourcesDir: '/tmp/src',
        failMessage: 'Permission denied'
      })
      expect(screen.getByText('Permission denied')).toBeTruthy()
    })
  })
})
