import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { ListFooter } from './list_footer.component'

describe('ListFooter', () => {
  describe('when rendering status text', () => {
    it('shows footer status', () => {
      render(
        <ListFooter
          footerStatus="10 of 50"
          isFullDetail={false}
          detailEntry={null}
          closeDetailToList={() => undefined}
        />
      )
      expect(screen.getByText('10 of 50')).toBeTruthy()
    })
  })

  describe('when rendering', () => {
    it('shows keyboard shortcuts span', () => {
      const { container } = render(
        <ListFooter footerStatus="done" isFullDetail={false} detailEntry={null} closeDetailToList={() => undefined} />
      )
      const keys = container.querySelector('.kb-pt-footer-keys')
      expect(keys).toBeTruthy()
      expect(keys?.textContent).toContain('N')
    })
  })

  describe('when detail is open', () => {
    it('shows scroll hint', () => {
      const { container } = render(
        <ListFooter
          footerStatus="done"
          isFullDetail={false}
          detailEntry={{ id: 1 } as unknown as import('@shared/rpc').RpcKnowledge}
          closeDetailToList={() => undefined}
        />
      )
      const keys = container.querySelector('.kb-pt-footer-keys')
      expect(keys?.textContent).toContain('scroll')
    })
  })
})
