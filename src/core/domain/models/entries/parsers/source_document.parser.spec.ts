import { describe, expect, it } from 'bun:test'
import { deriveId, toKnowledge } from '../../knowledges/factories/knowledge.factory'
import { parseSourceFile, parseSourceSection } from './source_document.parser'

const LOCATION_HINT_RE = /\/abs\/file\.yml:3: entry "bad-entry".*links.*Invalid/i

describe('parseSourceFile()', () => {
  describe.each([
    [
      'bookmarks',
      `
bookmarks:
  https://example.com:
    desc: Example site
    tags: [example]
`,
      'bookmark' as const,
      null as { priority: string; status: string } | null
    ],
    [
      'commands',
      `
commands:
  git status:
    desc: Show working tree status
    tags: [git]
`,
      'command' as const,
      null
    ],
    [
      'cheats',
      `
cheats:
  Math tip:
    desc: Some math
    tags: [math]
`,
      'cheat' as const,
      null
    ],
    [
      'tasks',
      `
tasks:
  My task:
    desc: Do something
    tags: [dev]
    priority: high
    status: doing
`,
      'task' as const,
      { priority: 'high', status: 'doing' }
    ]
  ])('when the section is %s', (_, yaml, expectedType, taskExtras) => {
    it(`assigns type "${expectedType}"`, () => {
      const entries = parseSourceFile('/test.yml', yaml)
      expect(entries).toHaveLength(1)
      const e = entries[0]
      if (!e) throw new Error('expected one entry')
      expect(e.type).toBe(expectedType)
      expect(e).not.toHaveProperty('id')
      if (taskExtras) {
        const task = e as { type: 'task'; priority?: string; status?: string }
        expect(task.priority).toBe(taskExtras.priority)
        expect(task.status).toBe(taskExtras.status)
      }
    })
  })

  it('when the section is unknown, returns no entries', () => {
    const yaml = `
unknown_section:
  key:
    desc: Ignored
    tags: [x]
`
    const entries = parseSourceFile('/test.yml', yaml)
    expect(entries).toHaveLength(0)
  })

  it('parses notes as a single object map', () => {
    const yaml = `
cheats:
  Tip one:
    desc: Object-shaped notes
    tags: [x]
    notes:
      md: |
        Hello
`
    const entries = parseSourceFile('/test.yml', yaml)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.notes).toEqual([{ md: 'Hello\n' }])
  })

  it('parses notes as a block string', () => {
    const yaml = `
cheats:
  Quote key:
    desc: Block scalar notes
    tags: [quote]
    notes: |
      > "Line one"
      >
      > - Attribution
`
    const entries = parseSourceFile('/test.yml', yaml)
    expect(entries).toHaveLength(1)
    const md = entries[0]?.notes?.[0]?.md
    expect(md).toBeDefined()
    expect(md).toContain('> "Line one"')
  })

  it('includes location hint in validation errors', () => {
    const yaml = `
bookmarks:
  bad-entry:
    desc: Test
    tags: [x]
    links: [not-a-url]
`
    expect(() => parseSourceFile('/abs/file.yml', yaml)).toThrow(LOCATION_HINT_RE)
  })

  it('returns empty array for empty yaml', () => {
    expect(parseSourceFile('/test.yml', '')).toHaveLength(0)
  })
})

describe('parseSourceSection()', () => {
  it('ignores non-object section values', () => {
    const result = parseSourceSection('bookmarks', 'not-an-object', '/f.yml', '')
    expect(result).toHaveLength(0)
  })
})

describe('toKnowledge() + deriveId()', () => {
  it('adds id and timestamps from a parsed entry', () => {
    const yaml = `
bookmarks:
  https://example.com:
    desc: Example site
    tags: [example]
`
    const [e] = parseSourceFile('/test.yml', yaml)
    if (!e) throw new Error('expected one entry')
    const now = 1_700_000_000_000
    const knowledge = toKnowledge(e, now)
    expect(knowledge.id).toBe(deriveId('bookmark', 'https://example.com'))
    expect(knowledge.createdAt).toBe(now)
    expect(knowledge.updatedAt).toBe(now)
    expect(knowledge.type).toBe('bookmark')
  })

  it('deriveId returns same id for same type+key', () => {
    expect(deriveId('bookmark', 'https://a.com')).toBe(deriveId('bookmark', 'https://a.com'))
  })

  it('deriveId returns different ids for different types', () => {
    expect(deriveId('bookmark', 'key')).not.toBe(deriveId('command', 'key'))
  })
})
