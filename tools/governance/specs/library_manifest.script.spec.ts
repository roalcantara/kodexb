import { describe, expect, it } from 'bun:test'
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(import.meta.dir, '../../..')
const MANIFEST = path.join(REPO_ROOT, 'assets/docs/archive/library_manifest.json')

describe('library_manifest.json', () => {
  it('pins foundation as 001', () => {
    const m = JSON.parse(readFileSync(MANIFEST, 'utf8')) as {
      entries: { nnn: string; slug: string; to: string }[]
    }
    expect(m.entries[0]?.to).toBe('001-foundation')
    expect(m.entries[0]?.slug).toBe('foundation')
  })

  it('has no duplicate nnn or slug', () => {
    const m = JSON.parse(readFileSync(MANIFEST, 'utf8')) as {
      entries: { nnn: string; slug: string }[]
    }
    const nnns = m.entries.map(e => e.nnn)
    const slugs = m.entries.map(e => e.slug)
    expect(new Set(nnns).size).toBe(nnns.length)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every numbered folder exists on disk', () => {
    const m = JSON.parse(readFileSync(MANIFEST, 'utf8')) as {
      entries: { to: string }[]
    }
    for (const e of m.entries) {
      const p = path.join(REPO_ROOT, 'assets/docs/archive', e.to)
      expect(statSync(p).isDirectory()).toBe(true)
    }
  })
})
