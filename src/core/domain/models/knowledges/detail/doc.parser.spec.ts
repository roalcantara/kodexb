import { describe, expect, it } from 'bun:test'
import { factoryFor } from '@testing'
import type { BookmarkKnowledge, CommandKnowledge, TaskKnowledge } from '../schemas/knowledge.schema'
import { buildPreamble } from './doc.parser'

const now = new Date('2026-06-01T00:00:00Z')

const baseBookmarkEntry: BookmarkKnowledge = {
  id: 1,
  type: 'bookmark',
  key: 'https://example.com',
  source: '/f.yml',
  desc: 'Example site',
  tags: ['x'],
  doc: '',
  createdAt: 0,
  updatedAt: 0
}

const baseTaskEntry: TaskKnowledge = {
  id: 1,
  type: 'task',
  key: 'Plan the launch',
  source: '/f.yml',
  desc: '',
  tags: ['work'],
  status: 'todo',
  doc: '',
  createdAt: 0,
  updatedAt: 0
}

const baseCmdEntry: CommandKnowledge = {
  id: 1,
  type: 'command',
  key: 'git status',
  source: '/f.yml',
  desc: 'Show working tree status',
  tags: ['git'],
  doc: '',
  createdAt: 0,
  updatedAt: 0
}

describe('buildPreamble', () => {
  describe('bookmark preamble', () => {
    it('returns embed + thumbnail for youtu.be short URLs', () => {
      const entry = { ...baseBookmarkEntry, key: 'https://youtu.be/dQw4w9WgXcQ' }
      const out = buildPreamble(entry, now)
      expect(out).toBe(
        '[Example site](https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed)\n\n![YouTube Thumbnail](https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg)'
      )
    })

    it('returns embed + thumbnail for youtube.com/watch URLs', () => {
      const entry = { ...baseBookmarkEntry, key: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
      const out = buildPreamble(entry, now)
      expect(out).toBe(
        '[Example site](https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed)\n\n![YouTube Thumbnail](https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg)'
      )
    })

    it('returns image markdown when previewImageUrl is provided (non-YouTube)', () => {
      const out = buildPreamble(baseBookmarkEntry, now, 'https://og.example.com/img.png')
      expect(out).toBe('![Example site](https://og.example.com/img.png)')
    })

    it('returns empty string when neither YouTube nor previewImageUrl is present', () => {
      const out = buildPreamble(baseBookmarkEntry, now)
      expect(out).toBe('')
    })

    it('returns image markdown with the right alt text when desc differs', () => {
      const entry = { ...baseBookmarkEntry, desc: 'My Blog Post' }
      const out = buildPreamble(entry, now, 'https://images.example.com/preview.png')
      expect(out).toBe('![My Blog Post](https://images.example.com/preview.png)')
    })
  })

  describe('cheat preamble', () => {
    it('always returns an empty string', () => {
      const out = buildPreamble({ ...baseCmdEntry, type: 'cheat', key: 'sample-cheat', desc: 'A cheat', tags: ['math'] }, now)
      expect(out).toBe('')
    })
  })

  describe('command preamble', () => {
    it('renders a fenced sh block with the key, then DESCRIPTION blockquote', () => {
      const out = buildPreamble(baseCmdEntry, now)
      expect(out).toContain('```sh')
      expect(out).toContain('git status')
      expect(out).toContain('```')
      expect(out).toContain('### DESCRIPTION')
      expect(out).toContain('> Show working tree status')
    })
  })

  describe('shortcut preamble', () => {
    it('lists every binding action so FTS can find them', () => {
      const out = buildPreamble(factoryFor('shortcut:vscodeKeymap'), now)
      expect(out).toContain('Go to File')
      expect(out).toContain('cmd+p')
      expect(out).toContain('### BINDINGS')
    })

    it('returns empty string when there are no bindings', () => {
      const out = buildPreamble(factoryFor('shortcut:vscodeKeymap', { overrides: { bindings: [] } }), now)
      expect(out).toBe('')
    })

    it('joins multi-step chord with spaces and modifiers with +', () => {
      const out = buildPreamble(
        factoryFor('shortcut:vscodeKeymap', {
          overrides: {
            bindings: [
              {
                id: 'release-go',
                chord: [
                  { modifiers: ['cmd'], key: 'k' },
                  { modifiers: [], key: 'p' }
                ],
                scope: 'local',
                action: 'Release Go To File'
              }
            ]
          }
        }),
        now
      )
      expect(out).toContain('cmd+k p')
      expect(out).toContain('Release Go To File')
    })
  })

  describe('task preamble', () => {
    it('renders title, status, and priority sections', () => {
      const t: TaskKnowledge = { ...baseTaskEntry, priority: 'high' }
      const out = buildPreamble(t, now)
      expect(out).toContain('# Plan the launch')
      expect(out).toContain('### STATUS')
      expect(out).toContain('TODO')
      expect(out).toContain('### PRIORITY')
      expect(out).toContain('HIGH')
    })

    it('omits desc blockquote when desc is empty', () => {
      const out = buildPreamble(baseTaskEntry, now)
      expect(out).not.toContain('>')
    })

    it('renders desc blockquote when desc is present', () => {
      const t: TaskKnowledge = { ...baseTaskEntry, desc: 'Coordinate the team' }
      const out = buildPreamble(t, now)
      expect(out).toContain('> Coordinate the team')
    })

    it('marks DUE DATE as OVERDUE when due < now and status !== done', () => {
      const t: TaskKnowledge = { ...baseTaskEntry, meta: { due: '2026-05-01' } }
      const out = buildPreamble(t, now)
      expect(out).toContain('### DUE DATE')
      expect(out).toContain('⚠ OVERDUE')
    })

    it('does NOT mark OVERDUE when status === done', () => {
      const t: TaskKnowledge = {
        ...baseTaskEntry,
        status: 'done',
        meta: { due: '2026-05-01' }
      }
      const out = buildPreamble(t, now)
      expect(out).toContain('### DUE DATE')
      expect(out).not.toContain('⚠ OVERDUE')
    })

    it('omits DUE DATE section when meta.due is absent', () => {
      const out = buildPreamble(baseTaskEntry, now)
      expect(out).not.toContain('### DUE DATE')
    })
  })
})
