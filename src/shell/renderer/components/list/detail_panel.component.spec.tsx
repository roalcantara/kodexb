import { describe, expect, it } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing/factories/factories.builder'
import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DetailPanel } from './detail_panel.component'

const noopSelect = () => undefined
const loadEntry = () => Promise.resolve(entry)
const pendingLoad = () => new Promise<null>(() => undefined)

const entry = factoryFor('bookmark', {
  overrides: {
    id: 42,
    key: 'example-bookmark',
    source: 'fixtures/test.yaml',
    desc: 'An example bookmark',
    tags: ['web'],
    doc: '',
    createdAt: 0,
    updatedAt: 0
  }
}) as RpcKnowledge

describe('DetailPanel', () => {
  describe('when entry is provided', () => {
    it('has visible class', () => {
      render(
        <DetailPanel
          entryId={entry.id}
          allEntries={[entry]}
          onClose={() => undefined}
          onSelectEntry={noopSelect}
          loadEntry={pendingLoad}
        />
      )
      const aside = document.querySelector('aside.theme-detail-panel')
      expect(aside?.classList.contains('theme-detail-panel--visible')).toBe(true)
    })
  })

  describe('when entry is null', () => {
    it('has no visible class', () => {
      render(<DetailPanel entryId={null} allEntries={[]} onClose={() => undefined} onSelectEntry={noopSelect} />)
      const aside = document.querySelector('aside.theme-detail-panel')
      expect(aside?.classList.contains('theme-detail-panel--visible')).toBe(false)
    })
  })

  describe('when close button is clicked', () => {
    it('calls onClose', async () => {
      let closed = false
      render(
        <DetailPanel
          entryId={entry.id}
          allEntries={[entry]}
          onClose={() => {
            closed = true
          }}
          onSelectEntry={noopSelect}
          loadEntry={loadEntry}
        />
      )
      await waitFor(() => expect(document.querySelector('button.theme-detail-page-close')).not.toBeNull())
      const btn = document.querySelector('button.theme-detail-page-close') as HTMLButtonElement
      await userEvent.click(btn)
      expect(closed).toBe(true)
    })
  })
})
