// @security
import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { exitCodeForFindings } from './exit_policy.script'
import { normalizeRepoPath, resolveBaseRef, selectCandidateFiles } from './file_selection.script'
import { pruneOlderThan } from './retention.script'
import { loadSecretsRules } from './rules_loader.script'
import { appendSecurityRunEvent } from './run_writer.script'

describe('security foundation', () => {
  it('exit policy maps strict severity semantics', () => {
    expect(exitCodeForFindings('critical', false)).toBe(1)
    expect(exitCodeForFindings('high', false)).toBe(1)
    expect(exitCodeForFindings('medium', true)).toBe(1)
    expect(exitCodeForFindings('medium', false)).toBe(0)
    expect(exitCodeForFindings('low', true)).toBe(0)
    expect(exitCodeForFindings(null, true)).toBe(0)
  })

  it('file selection can choose changed-only candidates', () => {
    const files = ['README.md', 'packages/ops/src/a', 'src/a', 'docs/x.txt']
    const mockGit = (args: string[]) => {
      if (args.includes('--staged')) return ['packages/ops/src/a', 'src/a']
      return []
    }
    const changed = selectCandidateFiles(files, { changedOnly: true, base: 'HEAD~1' }, mockGit)
    expect(changed).toContain('packages/ops/src/a')
    expect(changed).toContain('src/a')
    expect(changed).not.toContain('README.md')
    expect(resolveBaseRef(null)).toBe('HEAD')
    expect(normalizeRepoPath('a/b/c')).toBe('a/b/c')
  })

  it('run writer returns output path', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'sec-run-'))
    try {
      const result = appendSecurityRunEvent(root, 'run-1', {
        ts: new Date().toISOString(),
        phase: 'scan',
        trigger: 'gate',
        findingsCount: 0,
        severityMax: null,
        exitCode: 0,
        durationMs: 1,
        feature: '006-safety-hardening'
      })
      expect(result.filePath).toContain(path.join('tmp', 'security'))
      expect(result.ok).toBeTrue()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('retention prunes dated folders older than threshold', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'sec-retain-'))
    try {
      const securityRoot = path.join(root, 'tmp', 'security')
      mkdirSync(path.join(securityRoot, '2020-01-01'), { recursive: true })
      writeFileSync(path.join(securityRoot, '2020-01-01', '.keep'), '')
      mkdirSync(path.join(securityRoot, '2099-01-01'), { recursive: true })
      writeFileSync(path.join(securityRoot, '2099-01-01', '.keep'), '')
      // jscpd:ignore-start
      const removed = pruneOlderThan(root, 30, new Date('2026-06-07T00:00:00.000Z'))
      expect(removed.length).toBe(1)
      expect(removed[0]?.endsWith('2020-01-01')).toBeTrue()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
    // jscpd:ignore-end
  })

  it('rules loader reads JSON arrays and drops invalid entries', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'sec-rules-'))
    const file = path.join(dir, 'rules.json')
    try {
      writeFileSync(file, JSON.stringify([{ id: 'r1', pattern: 'abc' }, { nope: true }]))
      const rules = loadSecretsRules(file)
      expect(rules).toEqual([{ id: 'r1', pattern: 'abc' }])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
