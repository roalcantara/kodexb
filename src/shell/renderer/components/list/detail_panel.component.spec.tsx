/// <reference lib="dom" />

import { expect, test } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing'
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

test('DetailPanel has visible class when entry is provided', () => {
  render(
    <DetailPanel
      entryId={entry.id}
      allEntries={[entry]}
      onClose={() => undefined}
      onSelectEntry={noopSelect}
      loadEntry={pendingLoad}
    />
  )
  const aside = document.querySelector('aside.kb-detailPanel')
  expect(aside?.classList.contains('kb-detailPanel--visible')).toBe(true)
})

test('DetailPanel has no visible class when entry is null', () => {
  render(<DetailPanel entryId={null} allEntries={[]} onClose={() => undefined} onSelectEntry={noopSelect} />)
  const aside = document.querySelector('aside.kb-detailPanel')
  expect(aside?.classList.contains('kb-detailPanel--visible')).toBe(false)
})

test('DetailPanel close button calls onClose', async () => {
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
  await waitFor(() => expect(document.querySelector('button.kb-detailPage-close')).not.toBeNull())
  const btn = document.querySelector('button.kb-detailPage-close') as HTMLButtonElement
  await userEvent.click(btn)
  expect(closed).toBe(true)
})
