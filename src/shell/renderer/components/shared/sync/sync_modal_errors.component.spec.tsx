import { describe, expect, it } from 'bun:test'
import { fireEvent, render } from '@testing-library/react'
import { SyncModal, type SyncModalModel } from './sync_modal.component'
import { SYNC_MODAL_WIDTH_PX } from './sync_modal_layout.const'

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

function mountSyncModalLayoutStyles(): () => void {
  const style = document.createElement('style')
  style.textContent = `
    .cmp-sync-modal {
      box-sizing: border-box;
      width: min(var(--overlay-shell-width, ${SYNC_MODAL_WIDTH_PX}px), 100%);
      display: flex;
      flex-direction: column;
    }
    .cmp-sync-modal-log { min-width: 0; overflow-x: hidden; }
    .cmp-sync-modal-file-row { min-width: 0; }
    .cmp-sync-modal-file-main { min-width: 0; }
    .cmp-sync-modal-error-detail {
      box-sizing: border-box;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
      white-space: pre-wrap;
      overflow-x: hidden;
    }
  `
  document.head.appendChild(style)
  return () => style.remove()
}

function modalInlineStyle(): string {
  const modal = document.querySelector('.cmp-sync-modal') as HTMLElement | null
  if (!modal) throw new Error('expected .cmp-sync-modal')
  return modal.getAttribute('style') ?? ''
}

describe('SyncModal error UX', () => {
  describe('when phase is done with errors', () => {
    it('shows stats strip via cmp-sync-modal-stats-strip class', () => {
      renderSyncModal({
        ...baseModel,
        open: true,
        phase: 'done',
        sourcesDir: '/tmp/src',
        totalFiles: 3,
        processed: 3,
        fileLog: [
          makeFileLog('/tmp/src/ok.yaml', 'ok.yaml', true, 2, 0),
          makeFileLog('/tmp/src/bad.yaml', 'bad.yaml', false, 0, 0, 'parse error')
        ],
        summary: {
          filesProcessed: 2,
          inserted: 2,
          updated: 0,
          errors: ['/tmp/src/bad.yaml: parse error'],
          warnings: [],
          fileLog: []
        }
      })
      const statsStrip = document.querySelector('.cmp-sync-modal-stats-strip')
      expect(statsStrip?.textContent).toContain('Files processed:')
      expect(statsStrip?.textContent).toContain('Imported:')
      expect(statsStrip?.textContent).toContain('With errors:')
    })

    it('shows no cmp-sync-modal-summary-errors list', () => {
      renderSyncModal({
        ...baseModel,
        open: true,
        phase: 'done',
        sourcesDir: '/tmp/src',
        totalFiles: 1,
        processed: 1,
        fileLog: [makeFileLog('/tmp/src/bad.yaml', 'bad.yaml', false, 0, 0, 'parse error')],
        summary: {
          filesProcessed: 1,
          inserted: 0,
          updated: 0,
          errors: ['/tmp/src/bad.yaml: parse error'],
          warnings: [],
          fileLog: []
        }
      })
      expect(document.querySelector('.cmp-sync-modal-summary-errors')).toBeNull()
    })

    it('error rows have cmp-sync-modal-file-row--error class', () => {
      renderSyncModal({
        ...baseModel,
        open: true,
        phase: 'done',
        sourcesDir: '/tmp/src',
        totalFiles: 1,
        processed: 1,
        fileLog: [makeFileLog('/tmp/src/bad.yaml', 'bad.yaml', false, 0, 0, 'parse error')],
        summary: {
          filesProcessed: 1,
          inserted: 0,
          updated: 0,
          errors: ['/tmp/src/bad.yaml: parse error'],
          warnings: [],
          fileLog: []
        }
      })
      expect(document.querySelector('.cmp-sync-modal-file-row--error')).toBeTruthy()
    })
  })

  describe('accordion behavior', () => {
    it('renders error rows as buttons with chevron', () => {
      renderSyncModal({
        ...baseModel,
        open: true,
        phase: 'done',
        sourcesDir: '/tmp/src',
        totalFiles: 1,
        processed: 1,
        fileLog: [makeFileLog('/tmp/src/fail.yaml', 'fail.yaml', false, 0, 0, 'error text')],
        summary: {
          filesProcessed: 1,
          inserted: 0,
          updated: 0,
          errors: ['/tmp/src/fail.yaml: error text'],
          warnings: [],
          fileLog: []
        }
      })
      expect(document.querySelector('.cmp-sync-modal-file-row--interactive')).toBeTruthy()
      expect(document.querySelector('.cmp-sync-modal-chevron')).toBeTruthy()
    })

    it('auto-expands first error row and shows error detail', () => {
      renderSyncModal({
        ...baseModel,
        open: true,
        phase: 'done',
        sourcesDir: '/tmp/src',
        totalFiles: 1,
        processed: 1,
        fileLog: [makeFileLog('/tmp/src/fail.yaml', 'fail.yaml', false, 0, 0, 'first error')],
        summary: {
          filesProcessed: 1,
          inserted: 0,
          updated: 0,
          errors: ['/tmp/src/fail.yaml: first error'],
          warnings: [],
          fileLog: []
        }
      })
      const errorDetail = document.querySelector('.cmp-sync-modal-error-detail')
      expect(errorDetail?.textContent).toContain('first error')
    })

    it('partial import rows show error styling from summary errors only', () => {
      renderSyncModal({
        ...baseModel,
        open: true,
        phase: 'done',
        sourcesDir: '/tmp/src',
        totalFiles: 1,
        processed: 1,
        fileLog: [makeFileLog('/tmp/src/partial.yml', 'partial.yml', true, 3, 0)],
        summary: {
          filesProcessed: 1,
          inserted: 3,
          updated: 0,
          errors: ['/tmp/src/partial.yml: entry "bad-key": invalid tags'],
          warnings: [],
          fileLog: []
        }
      })
      expect(document.querySelector('.cmp-sync-modal-file-row--error')).toBeTruthy()
      expect(document.querySelector('.cmp-sync-modal-error-detail')?.textContent).toContain('invalid tags')
    })

    it('keeps modal layout stable when the error accordion toggles', () => {
      const teardownStyles = mountSyncModalLayoutStyles()
      const longError =
        '/tmp/src/claude.yml: entry "curl https://api.anthropic.com/v1/agents -H Content-Type: application/json -H x-api-key: secret" ' +
        'repeat '.repeat(12)

      renderSyncModal({
        ...baseModel,
        open: true,
        phase: 'done',
        sourcesDir: '/tmp/src',
        totalFiles: 1,
        processed: 1,
        fileLog: [makeFileLog('/tmp/src/claude.yml', 'claude.yml', true, 30, 0)],
        summary: {
          filesProcessed: 1,
          inserted: 30,
          updated: 0,
          errors: [longError],
          warnings: [],
          fileLog: []
        }
      })

      const modal = document.querySelector('.cmp-sync-modal') as HTMLElement
      expect(modal.style.getPropertyValue('--overlay-shell-width')).toBe(`${SYNC_MODAL_WIDTH_PX}px`)

      const styleWhenExpanded = modalInlineStyle()
      const toggle = document.querySelector('.cmp-sync-modal-file-row--interactive') as HTMLButtonElement
      fireEvent.click(toggle)
      expect(modalInlineStyle()).toBe(styleWhenExpanded)
      expect(document.querySelector('.cmp-sync-modal-error-detail')).toBeNull()

      fireEvent.click(toggle)
      expect(modalInlineStyle()).toBe(styleWhenExpanded)
      expect(document.querySelector('.cmp-sync-modal-error-detail')?.textContent).toContain('claude.yml')

      teardownStyles()
    })
  })
})
