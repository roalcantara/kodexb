// @security
import { describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runElectrobunSurfaceCheck } from './electrobun_surface.script.ts'

function withConfig(content: string): { file: string; cleanup: () => void } {
  const dir = mkdtempSync(path.join(tmpdir(), 'electrobun-sec-'))
  const file = path.join(dir, 'electrobun.config.ts')
  writeFileSync(file, content)
  return { file, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

describe('electrobun_surface.script', () => {
  it('returns no findings for compliant external view policies', () => {
    const ctx = withConfig(
      'const cfg = { externalViews: [{ sandbox: true, partition: "persist:kb", navigation: ["https://example.com"] }] }'
    )
    try {
      expect(runElectrobunSurfaceCheck(ctx.file)).toHaveLength(0)
    } finally {
      ctx.cleanup()
    }
  })

  it('emits high findings for missing surface requirements', () => {
    const ctx = withConfig('const cfg = { externalViews: [{ sandbox: false, partition: "", navigation: ["*"] }] }')
    try {
      const findings = runElectrobunSurfaceCheck(ctx.file)
      expect(findings.length).toBeGreaterThan(0)
      expect(findings[0]?.severity).toBe('high')
    } finally {
      ctx.cleanup()
    }
  })
})
