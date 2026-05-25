import { describe, expect, it } from 'bun:test'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { MdView } from './md_view.component'

describe('MdView', () => {
  describe('when rendering markdown', () => {
    it('renders a paragraph', () => {
      render(<MdView markdown="Hello world" />)
      const p = document.querySelector('.theme-md-view p')
      expect(p?.textContent).toBe('Hello world')
    })

    it('renders fenced code block with language class', () => {
      render(<MdView markdown={'```ts\nconst x = 1\n```'} />)
      const code = document.querySelector('.theme-md-view code')
      expect(code).not.toBeNull()
      const hasLangClass = Array.from(code?.classList ?? []).some(c => c.startsWith('language-'))
      expect(hasLangClass).toBe(true)
    })
  })

  describe('when clicking links', () => {
    it('routes through callback', async () => {
      let opened = ''
      render(
        <MdView
          markdown="[Docs](https://example.com/docs)"
          onOpenExternal={url => {
            opened = url
          }}
        />
      )
      await userEvent.click(document.querySelector('.theme-md-view-link') as HTMLButtonElement)
      expect(opened).toBe('https://example.com/docs')
    })
  })
})
