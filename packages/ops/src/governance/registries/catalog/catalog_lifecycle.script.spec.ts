import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  appendCatalogEntryBlock,
  findEntryBySpecSlug,
  patchCatalogStatus,
  registerCatalogEntry
} from './catalog_lifecycle.script'

/** Catalog fixture — no live assets/specs/NNN-* paths in tests (see DOC_AUTHORITY.md). */
const SAMPLE_CATALOG = `# Shipped-feature catalog
smoke_feature:
  title: Smoke feature
  status: shipped
  specs:
    - smoke-feature
  superseded_by: null
`

function withCatalogTempRoot(run: (root: string) => void): void {
  const root = mkdtempSync(path.join(tmpdir(), 'kb-catalog-reg-'))
  try {
    mkdirSync(path.join(root, 'assets/catalog'), { recursive: true })
    writeFileSync(path.join(root, 'assets/catalog/catalog.yaml'), SAMPLE_CATALOG)
    run(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function featureFixtureDir(root: string, slug: string): string {
  const dir = path.join(root, 'packages/ops/src/__tests__/fixtures/workflow', slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'spec.md'), `# ${slug.replace(/-/g, ' ')}\n`)
  return dir
}

describe('catalog_lifecycle.script', () => {
  it('findEntryBySpecSlug matches specs list', () => {
    const catalog = {
      smoke_feature: {
        title: 'x',
        status: 'shipped',
        specs: ['smoke-feature']
      }
    }
    expect(findEntryBySpecSlug(catalog, 'smoke-feature')?.id).toBe('smoke_feature')
    expect(findEntryBySpecSlug(catalog, 'missing')).toBeNull()
  })

  it('appendCatalogEntryBlock appends in-progress entry', () => {
    const out = appendCatalogEntryBlock(SAMPLE_CATALOG, 'demo_feat', 'Demo feat', 'demo-feat')
    expect(out).toContain('demo_feat:')
    expect(out).toContain('status: in-progress')
    expect(out).toContain('- demo-feat')
  })

  it('patchCatalogStatus updates only the target key', () => {
    const yaml = `${SAMPLE_CATALOG}
workflows:
  title: Workflows
  status: in-progress
  specs:
    - 009-agentic-workflow-orchestrator
  superseded_by: null
`
    const out = patchCatalogStatus(yaml, 'workflows', 'shipped')
    expect(out).toContain('workflows:\n  title: Workflows\n  status: shipped')
    expect(out).toContain('smoke_feature:\n  title: Smoke feature\n  status: shipped')
  })

  it('registerCatalogEntry is idempotent for existing spec slug', () => {
    withCatalogTempRoot(root => {
      const featureDir = featureFixtureDir(root, 'smoke-feature')
      const first = registerCatalogEntry(featureDir, root)
      expect(first.action).toBe('unchanged')
      expect(first.key).toBe('smoke_feature')
      const after = readFileSync(path.join(root, 'assets/catalog/catalog.yaml'), 'utf-8')
      expect(after).toBe(SAMPLE_CATALOG)
    })
  })

  it('registerCatalogEntry creates in-progress entry for new spec', () => {
    withCatalogTempRoot(root => {
      const featureDir = featureFixtureDir(root, 'demo-feat')
      const result = registerCatalogEntry(featureDir, root)
      expect(result.action).toBe('created')
      expect(result.key).toBe('demo_feat')
      const after = readFileSync(path.join(root, 'assets/catalog/catalog.yaml'), 'utf-8')
      expect(after).toContain('demo_feat:')
      expect(after).toContain('status: in-progress')
    })
  })
})
