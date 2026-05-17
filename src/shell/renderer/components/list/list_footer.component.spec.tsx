/// <reference lib="dom" />

import { expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { ListFooter } from './list_footer.component'

test('ListFooter renders status text', () => {
  render(
    <ListFooter footerStatus="10 of 50" isFullDetail={false} detailEntry={null} closeDetailToList={() => undefined} />
  )
  expect(screen.getByText('10 of 50')).toBeTruthy()
})

test('ListFooter renders keyboard shortcuts span', () => {
  const { container } = render(
    <ListFooter footerStatus="done" isFullDetail={false} detailEntry={null} closeDetailToList={() => undefined} />
  )
  const keys = container.querySelector('.kb-pt-footer-keys')
  expect(keys).toBeTruthy()
  expect(keys?.textContent).toContain('N')
})

test('ListFooter shows scroll hint when detail is open', () => {
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
