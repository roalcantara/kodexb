/// <reference lib="dom" />
import { expect, test } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { primaryClipboardContent } from './clipboard_content.util'

test('bookmark returns key (URL)', () => {
  expect(primaryClipboardContent({ type: 'bookmark', key: 'https://example.com' } as RpcKnowledge)).toBe(
    'https://example.com'
  )
})

test('command returns key', () => {
  expect(primaryClipboardContent({ type: 'command', key: 'git log' } as RpcKnowledge)).toBe('git log')
})

test('cheat returns doc when available', () => {
  expect(primaryClipboardContent({ type: 'cheat', key: 'Math', doc: '# Formulas' } as RpcKnowledge)).toBe('# Formulas')
})

test('cheat returns key when doc is empty', () => {
  expect(primaryClipboardContent({ type: 'cheat', key: 'Math', doc: '' } as RpcKnowledge)).toBe('Math')
})

test('task returns key', () => {
  expect(primaryClipboardContent({ type: 'task', key: 'Build app' } as RpcKnowledge)).toBe('Build app')
})
