/// <reference lib="dom" />

import { expect, test } from 'bun:test'
import { render, screen, waitFor } from '@testing-library/react'

import { PreviewImage } from './preview_image.component'

test('PreviewImage renders a skeleton while loading', () => {
  render(<PreviewImage url="https://example.com" fetchImage={() => new Promise(() => undefined)} />)
  expect(screen.getByLabelText('Loading preview image')).not.toBeNull()
})

test('PreviewImage renders image returned by RPC', async () => {
  render(
    <PreviewImage url="https://example.com" fetchImage={() => Promise.resolve({ url: 'https://img.example/a.png' })} />
  )
  await waitFor(() =>
    expect(document.querySelector('.kb-previewImage img')?.getAttribute('src')).toBe('https://img.example/a.png')
  )
})

test('PreviewImage hides when RPC fails', async () => {
  render(<PreviewImage url="https://example.com" fetchImage={() => Promise.reject(new Error('no image'))} />)
  await waitFor(() => expect(document.querySelector('.kb-previewImage')).toBeNull())
})

test('PreviewImage renders YouTube thumbnail and button', () => {
  render(<PreviewImage url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />)
  expect(document.querySelector('.kb-previewImage img')?.getAttribute('src')).toContain('dQw4w9WgXcQ')
  expect(screen.getByText('▶ Open on YouTube')).not.toBeNull()
})
