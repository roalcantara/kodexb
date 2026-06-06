import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { buildManifest, verifyManifest } from './library_manifest.script.ts'

const REPO_ROOT = path.resolve(import.meta.dir, '../../..')
const MANIFEST = path.join(REPO_ROOT, 'assets/catalog/library.yaml')
const ARCHIVE = path.join(REPO_ROOT, 'assets/docs/archive')
const NUMBERED_DIR_RE = /^\d{3}-.+$/

function listNumberedDirs(): string[] {
  return readdirSync(ARCHIVE)
    .filter(d => NUMBERED_DIR_RE.test(d))
    .sort()
}

describe('library.yaml', () => {
  it('pins foundation as 001', () => {
    const yaml = readFileSync(MANIFEST, 'utf8')
    const m = Bun.YAML.parse(yaml) as {
      archive_root: string
      entries: { nnn: string; slug: string; folder: string }[]
    }
    expect(m.archive_root).toBe('assets/docs/archive')
    expect(m.entries[0]?.folder).toBe('001-foundation')
    expect(m.entries[0]?.slug).toBe('foundation')
  })

  it('has no duplicate nnn or slug', () => {
    const yaml = readFileSync(MANIFEST, 'utf8')
    const m = Bun.YAML.parse(yaml) as {
      entries: { nnn: string; slug: string }[]
    }
    const nnns = m.entries.map(e => e.nnn)
    const slugs = m.entries.map(e => e.slug)
    expect(new Set(nnns).size).toBe(nnns.length)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every numbered folder exists on disk', () => {
    const yaml = readFileSync(MANIFEST, 'utf8')
    const m = Bun.YAML.parse(yaml) as {
      entries: { folder: string }[]
    }
    for (const e of m.entries) {
      const p = path.join(ARCHIVE, e.folder)
      expect(statSync(p).isDirectory()).toBe(true)
    }
  })

  it('buildManifest scans all 45 numbered dirs', () => {
    const m = buildManifest()
    expect(m.entries.length).toBe(45)
    expect(m.entries[0]?.folder).toBe('001-foundation')
    expect(m.entries[0]?.nnn).toBe('001')
    expect(m.entries[0]?.slug).toBe('foundation')
  })

  it('verifyManifest passes on current YAML vs disk', () => {
    const yaml = readFileSync(MANIFEST, 'utf8')
    const yamlManifest = Bun.YAML.parse(yaml) as {
      entries: { nnn: string; slug: string; folder: string; birth_iso: string }[]
      archive_root: string
      generated_at: string
    }
    const onDisk = listNumberedDirs()
    const errors = verifyManifest(yamlManifest, onDisk)
    expect(errors).toEqual([])
  })
})
