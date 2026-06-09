import { describe, expect, it } from 'bun:test'
import { catalogKeyFromSlug, resolveCatalogKey, slugFromFeatureDir } from './resolve_catalog_key.script'

const FAKE_REPO = '/repo'
const SPECS_DIR = 'assets/specs'
const KEY_PATTERN = /^[a-z]/

describe('resolve_catalog_key', () => {
  describe('catalogKeyFromSlug', () => {
    it('strips leading digits and dash', () => {
      expect(catalogKeyFromSlug('008-task-mutation-failure-ux')).toBe('task_mutation_failure_ux')
    })

    it('handles slug without leading digits', () => {
      expect(catalogKeyFromSlug('sync-frecency-preserve')).toBe('sync_frecency_preserve')
    })

    it('replaces hyphens with underscores', () => {
      expect(catalogKeyFromSlug('a-b-c-d')).toBe('a_b_c_d')
    })
  })

  describe('slugFromFeatureDir', () => {
    it('extracts slug from full path', () => {
      expect(slugFromFeatureDir(`${FAKE_REPO}/${SPECS_DIR}/008-task-mutation-failure-ux`)).toBe(
        'task-mutation-failure-ux'
      )
    })

    it('extracts slug from relative dir', () => {
      expect(slugFromFeatureDir(`${SPECS_DIR}/007-task-source-atomicity`)).toBe('task-source-atomicity')
    })

    it('handles slug without leading digits', () => {
      expect(slugFromFeatureDir(`${FAKE_REPO}/${SPECS_DIR}/my-feature`)).toBe('my-feature')
    })
  })

  describe('resolveCatalogKey', () => {
    it('uses the real catalog file and returns a result', () => {
      const result = resolveCatalogKey(`${SPECS_DIR}/007-task-source-atomicity`)
      expect(result).toHaveProperty('ok')
      expect(result).toHaveProperty('key')
      expect(result.key).toMatch(KEY_PATTERN)
    })

    it('returns derived key with warning for unknown slug', () => {
      const result = resolveCatalogKey(`${SPECS_DIR}/999-unknown-feature`)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.warning).toBeTruthy()
      }
    })

    it('returns derived key with warning for nonexistent path', () => {
      const result = resolveCatalogKey('/nonexistent/path')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.warning).toBeTruthy()
      }
    })
  })
})
