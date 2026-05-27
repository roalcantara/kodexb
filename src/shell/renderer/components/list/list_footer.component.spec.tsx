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
    it('shows keyboard shortcut chips', () => {
      const { container } = render(
        <ListFooter footerStatus="done" isFullDetail={false} detailEntry={null} closeDetailToList={() => undefined} />
      )
      const keys = container.querySelector('.cmp-footer-keys')
      expect(keys).toBeTruthy()
      expect(container.querySelectorAll('.cmp-kbd').length).toBeGreaterThanOrEqual(8)
    })
  })

  describe('when detail is open', () => {
    it('shows scroll shortcut chips', () => {
      const { container } = render(
        <ListFooter
          footerStatus="done"
          isFullDetail={false}
          detailEntry={{ id: 1 } as unknown as import('@shared/rpc').RpcKnowledge}
          closeDetailToList={() => undefined}
        />
      )
      expect(container.querySelectorAll('.cmp-kbd').length).toBeGreaterThanOrEqual(10)
    })
  })
})
