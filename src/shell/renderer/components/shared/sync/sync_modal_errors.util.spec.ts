import { describe, expect, it } from 'bun:test'
import type { RpcSyncFileResult } from '@shared/rpc'
import { buildFileLogViews } from './sync_modal_errors.util'

const makeFile = (overrides: Partial<RpcSyncFileResult> = {}): RpcSyncFileResult => ({
  path: '/src/a.yml',
  label: 'a.yml',
  ok: true,
  inserted: 0,
  updated: 0,
  ...overrides
})

describe('buildFileLogViews', () => {
  describe('file-level error only', () => {
    it('includes f.error in issues and marks hasIssues true', () => {
      const fileLog: RpcSyncFileResult[] = [
        makeFile({ path: '/src/a.yml', ok: false, error: 'YAML syntax error at line 3' })
      ]
      const summaryErrors: string[] = []

      const result = buildFileLogViews(fileLog, summaryErrors)

      expect(result).toHaveLength(1)
      expect(result[0]?.issues).toEqual(['YAML syntax error at line 3'])
      expect(result[0]?.hasIssues).toBe(true)
    })
  })

  describe('entry-level errors only', () => {
    it('collects summaryErrors that startWith file path', () => {
      const fileLog: RpcSyncFileResult[] = [makeFile({ path: '/src/b.yml', ok: true, inserted: 1 })]
      const summaryErrors: string[] = [
        '/src/b.yml: entry "key1": missing required field "type"',
        '/src/b.yml: entry "key2": invalid value for "type"'
      ]

      const result = buildFileLogViews(fileLog, summaryErrors)

      expect(result).toHaveLength(1)
      expect(result[0]?.issues).toEqual([
        '/src/b.yml: entry "key1": missing required field "type"',
        '/src/b.yml: entry "key2": invalid value for "type"'
      ])
      expect(result[0]?.hasIssues).toBe(true)
    })
  })

  describe('partial file', () => {
    it('hasIssues is true even when ok is true (entry errors)', () => {
      const fileLog: RpcSyncFileResult[] = [makeFile({ path: '/src/c.yml', ok: true, inserted: 5, updated: 2 })]
      const summaryErrors: string[] = ['/src/c.yml: entry "x": duplicate key']

      const result = buildFileLogViews(fileLog, summaryErrors)

      expect(result).toHaveLength(1)
      expect(result[0]?.ok).toBe(true)
      expect(result[0]?.issues).toEqual(['/src/c.yml: entry "x": duplicate key'])
      expect(result[0]?.hasIssues).toBe(true)
    })
  })

  describe('dedup', () => {
    it('same error string from f.error and summaryErrors appears once', () => {
      const fileLog: RpcSyncFileResult[] = [
        makeFile({ path: '/src/d.yml', ok: false, error: '/src/d.yml: parse failed' })
      ]
      const summaryErrors: string[] = ['/src/d.yml: parse failed']

      const result = buildFileLogViews(fileLog, summaryErrors)

      expect(result).toHaveLength(1)
      expect(result[0]?.issues).toEqual(['/src/d.yml: parse failed'])
      expect(result[0]?.issues).toHaveLength(1)
    })
  })

  describe('no errors', () => {
    it('all rows have issues: [] and hasIssues: false', () => {
      const fileLog: RpcSyncFileResult[] = [
        makeFile({ path: '/src/ok1.yml', ok: true, inserted: 1 }),
        makeFile({ path: '/src/ok2.yml', ok: true, inserted: 2, updated: 1 })
      ]
      const summaryErrors: string[] = []

      const result = buildFileLogViews(fileLog, summaryErrors)

      expect(result).toHaveLength(2)
      for (const row of result) {
        expect(row).toBeDefined()
        expect(typeof row.hasIssues).toBe('boolean')
        expect(Array.isArray(row.issues)).toBe(true)
        expect(row.issues).toEqual([])
        expect(row.hasIssues).toBe(false)
      }
    })
  })

  describe('empty fileLog', () => {
    it('returns empty array', () => {
      const result = buildFileLogViews([], ['/src/a.yml: some error'])
      expect(result).toEqual([])
    })
  })

  describe('mixed files', () => {
    it('each file has correct issues and hasIssues', () => {
      const fileLog: RpcSyncFileResult[] = [
        makeFile({ path: '/src/success.yml', label: 'success.yml', ok: true, inserted: 3 }),
        makeFile({ path: '/src/fail.yml', label: 'fail.yml', ok: false, error: 'file read error' }),
        makeFile({ path: '/src/partial.yml', label: 'partial.yml', ok: true, inserted: 1 })
      ]
      const summaryErrors: string[] = ['/src/partial.yml: entry "k": invalid']

      const result = buildFileLogViews(fileLog, summaryErrors)

      expect(result).toHaveLength(3)

      expect(result[0]?.path).toBe('/src/success.yml')
      expect(result[0]?.issues).toEqual([])
      expect(result[0]?.hasIssues).toBe(false)

      expect(result[1]?.path).toBe('/src/fail.yml')
      expect(result[1]?.issues).toEqual(['file read error'])
      expect(result[1]?.hasIssues).toBe(true)

      expect(result[2]?.path).toBe('/src/partial.yml')
      expect(result[2]?.issues).toEqual(['/src/partial.yml: entry "k": invalid'])
      expect(result[2]?.hasIssues).toBe(true)
    })
  })
})
