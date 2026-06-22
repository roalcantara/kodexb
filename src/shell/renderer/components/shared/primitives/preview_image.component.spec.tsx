import { describe, expect, it } from 'bun:test'
import { render, screen, waitFor } from '@testing-library/react'

import { PreviewImage } from './preview_image.component'

describe('PreviewImage', () => {
  describe('while loading', () => {
    it('renders a skeleton', () => {
      render(<PreviewImage url="https://example.com" fetchImage={() => new Promise(() => undefined)} />)
      expect(screen.getByLabelText('Loading preview image')).not.toBeNull()
    })
  })

  describe('when RPC resolves', () => {
    it('renders the returned image', async () => {
      render(
        <PreviewImage
          url="https://example.com"
          fetchImage={() => Promise.resolve({ url: 'https://img.example/a.png' })}
        />
      )
      await waitFor(() =>
        expect(document.querySelector('.cmp-preview-image img')?.getAttribute('src')).toBe('https://img.example/a.png')
      )
    })
  })

  describe('when RPC fails', () => {
    it('hides the container', async () => {
      render(<PreviewImage url="https://example.com" fetchImage={() => Promise.reject(new Error('no image'))} />)
      await waitFor(() => expect(document.querySelector('.cmp-preview-image')).toBeNull())
    })
  })

  describe('with a YouTube URL', () => {
    it('renders thumbnail and button', () => {
      render(<PreviewImage url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />)
      expect(document.querySelector('.cmp-preview-image img')?.getAttribute('src')).toContain('dQw4w9WgXcQ')
      expect(screen.getByText('▶ Open on YouTube')).not.toBeNull()
    })
  })
})
