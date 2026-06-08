// @security
import { describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runSecretsCheck } from './secrets.script.ts'

describe('secrets.script', () => {
  it('emits critical findings for obvious secret patterns', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'secret-check-'))
    const file = path.join(dir, 'sample.txt')
    try {
      writeFileSync(file, 'api_key = "ghp_1234567890ABCDEFGHIJKL12345"\n')
      const findings = runSecretsCheck([file])
      // jscpd:ignore-start
      expect(findings.length).toBeGreaterThan(0)
      expect(findings[0]?.severity).toBe('critical')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
    // jscpd:ignore-end
  })

  it('skips files larger than 5 MiB', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'secret-check-'))
    const file = path.join(dir, 'big.txt')
    try {
      writeFileSync(file, 'a'.repeat(5 * 1024 * 1024 + 1))
      const findings = runSecretsCheck([file])
      expect(findings).toHaveLength(0)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
