import { describe, expect, it } from 'bun:test'
import path from 'node:path'
import { resolveActiveFeatureDir } from './resolve_active_feature_dir.script'

const SPECS_ROOT = path.resolve(import.meta.dir, '../../../assets/specs')

describe('resolveActiveFeatureDir', () => {
  describe('when argDir is provided', () => {
    it('resolves a valid feature dir', () => {
      const result = resolveActiveFeatureDir(path.join(SPECS_ROOT, '008-task-mutation-failure-ux'))
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.featureDir).toContain('008-task-mutation-failure-ux')
      }
    })

    it('rejects a dir without spec.md', () => {
      const result = resolveActiveFeatureDir('/tmp')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.exitCode).toBe(2)
        expect(result.message).toContain('does not contain spec.md')
      }
    })
  })
})
