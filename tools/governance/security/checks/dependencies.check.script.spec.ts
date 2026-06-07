// @security
import { describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runDependenciesCheck } from './dependencies.check.script.ts'
import { parseLockDelta } from './dependencies.delta.script.ts'

describe('dependencies.check', () => {
  const mockGit = (stdout: string) => (args: string[]) => {
    if (args.includes('diff')) {
      return { status: 0, stdout: Buffer.from(stdout) }
    }
    return { status: 1, stdout: Buffer.from('') }
  }

  it('parses lockfile rows into package/version tuples', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'dep-check-'))
    const lock = path.join(dir, 'bun.lock')
    try {
      const diffOutput = '+ vulnerable-lib 1.0.0\n+ safe-lib 2.0.0\n'
      const parsed = parseLockDelta(lock, 'HEAD', mockGit(diffOutput))
      expect(parsed).toHaveLength(2)
      expect(parsed[0]).toEqual({ packageName: 'vulnerable-lib', version: '1.0.0' })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('emits findings when lock entries match cve list', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'dep-check-'))
    const lock = path.join(dir, 'bun.lock')
    const cves = path.join(dir, 'cve.list.yml')
    try {
      const diffOutput = '+ vulnerable-lib 1.0.0\n'
      const cveYaml = '- packageName: vulnerable-lib\n  version: 1.0.0\n  cve: CVE-2099-0001\n  severity: critical\n'
      writeFileSync(cves, cveYaml)
      const findings = runDependenciesCheck(lock, cves, 'HEAD', mockGit(diffOutput))
      expect(findings.length).toBeGreaterThan(0)
      expect(findings[0]?.severity).toBe('critical')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
