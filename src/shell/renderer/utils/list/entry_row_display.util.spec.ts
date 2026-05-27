import { describe, expect, it } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing'

import {
  entryGlyphTileClass,
  entryMetaSemanticClass,
  entryMetaText,
  entryTagItems,
  entryTitleText
} from './entry_row_display.util'

describe('entry_row_display.util', () => {
  describe('entryTitleText', () => {
    it('prefers description when present', () => {
      const entry = factoryFor('bookmark', {
        overrides: { key: 'https://x.test', desc: 'Readable title', tags: [] }
      }) as RpcKnowledge
      expect(entryTitleText(entry)).toBe('Readable title')
    })

    it('falls back to key when description is empty', () => {
      const entry = factoryFor('command', {
        overrides: { key: 'npm test', desc: '', tags: [] }
      }) as RpcKnowledge
      expect(entryTitleText(entry)).toBe('npm test')
    })
  })

  describe('entryMetaSemanticClass', () => {
    it('maps bookmark to semantic-url', () => {
      const entry = factoryFor('bookmark', { overrides: { tags: [] } }) as RpcKnowledge
      expect(entryMetaSemanticClass(entry)).toBe('semantic-url')
    })

    it('maps command to semantic-command', () => {
      const entry = factoryFor('command', { overrides: { tags: [] } }) as RpcKnowledge
      expect(entryMetaSemanticClass(entry)).toBe('semantic-command')
    })
  })

  describe('entryGlyphTileClass', () => {
    it('uses task tile modifier for tasks', () => {
      const entry = factoryFor('task', { overrides: { tags: [], status: 'todo' } }) as RpcKnowledge
      expect(entryGlyphTileClass(entry)).toContain('cmp-entry-glyph-tile--task')
    })
  })

  describe('entryTagItems', () => {
    it('includes type hash and tag hashes', () => {
      const entry = factoryFor('cheat', {
        overrides: { tags: ['security'], desc: '', key: 'audit' }
      }) as RpcKnowledge
      const labels = entryTagItems(entry).map(i => i.label)
      expect(labels).toEqual(['#cheat', '#security'])
    })
  })

  describe('entryMetaText', () => {
    it('truncates long bookmark URLs', () => {
      const longUrl = `https://example.com/${'a'.repeat(60)}`
      const entry = factoryFor('bookmark', {
        overrides: { key: longUrl, desc: '', tags: [] }
      }) as RpcKnowledge
      expect(entryMetaText(entry).endsWith('…')).toBe(true)
    })
  })
})
