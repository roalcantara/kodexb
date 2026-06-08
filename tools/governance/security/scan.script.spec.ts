// @security
import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { exitCodeForFindings } from './exit_policy.script.ts'
import { pruneOlderThan } from './retention.script.ts'
import { appendSecurityRunEvent } from './run_writer.script.ts'

describe('scan.script @security integration contracts', () => {
  it('severity matrix follows strict policy', () => {
    expect(exitCodeForFindings('low', true)).toBe(0)
    expect(exitCodeForFindings('medium', true)).toBe(1)
    expect(exitCodeForFindings('high', true)).toBe(1)
    expect(exitCodeForFindings('critical', false)).toBe(1)
  })

  it('writes security_run events with expected shape fields', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'scan-event-'))
    try {
      const result = appendSecurityRunEvent(root, 'run-test', {
        ts: new Date().toISOString(),
        phase: 'scan',
        trigger: 'hk',
        findingsCount: 2,
        severityMax: 'high',
        exitCode: 1,
        durationMs: 14,
        feature: '006-safety-hardening'
      })
      expect(result.ok).toBeTrue()
      expect(result.filePath).toContain(path.join('tmp', 'security'))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('retention prune removes stale date directories', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'scan-retention-'))
    try {
      const oldDir = path.join(root, 'tmp', 'security', '2020-01-01')
      const newDir = path.join(root, 'tmp', 'security', '2099-01-01')
      mkdirSync(oldDir, { recursive: true })
      mkdirSync(newDir, { recursive: true })
      writeFileSync(path.join(oldDir, '.keep'), '')
      writeFileSync(path.join(newDir, '.keep'), '')
      const removed = pruneOlderThan(root, 30, new Date('2026-06-07T00:00:00.000Z'))
      expect(removed.length).toBe(1)
      expect(removed[0]?.endsWith('2020-01-01')).toBeTrue()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
