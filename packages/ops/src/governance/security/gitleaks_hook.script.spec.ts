// @security
import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { repoRoot } from '../../support/lib/shared/repo_root.script'
import {
  buildHkGitleaksDirArgv,
  buildHkGitleaksProtectStagedArgv,
  gitleaksOnPath,
  parseGitleaksScannedBytes,
  runHkGitleaksDir,
  runHkGitleaksProtectStaged
} from './gitleaks_hook.script'

const SINGLE_OPS_PATH = 'packages/ops/src/governance/specs/workflow/review_handoff_core.script.ts'

const CLOSEOUT_MULTI_PATH_SCAN = [
  'packages/ops/src/governance/specs/handoff_evidence.script.spec.ts',
  'packages/ops/src/governance/specs/workflow/review_handoff.script.spec.ts',
  'packages/ops/src/governance/specs/workflow/review_handoff_core.script.ts'
] as const

describe('buildHkGitleaksProtectStagedArgv', () => {
  it('matches hk.pkl gitleaks hygiene step', () => {
    expect(buildHkGitleaksProtectStagedArgv()).toEqual(['protect', '--staged', '--redact', '--verbose', '--no-banner'])
  })
})

describe('buildHkGitleaksDirArgv', () => {
  it('documents the legacy Builtins.gitleaks multi-path bug', () => {
    expect(buildHkGitleaksDirArgv(['a.ts', 'b.ts'])).toEqual([
      'dir',
      '--redact',
      '--verbose',
      '--no-banner',
      'a.ts',
      'b.ts'
    ])
  })
})

describe('parseGitleaksScannedBytes', () => {
  it('reads the scanned byte count from gitleaks logs', () => {
    expect(parseGitleaksScannedBytes('12:35AM INF scanned ~1280555946 bytes (1.28 GB) in 37s')).toBe(1_280_555_946)
    expect(parseGitleaksScannedBytes('12:58AM INF scanned ~1720 bytes (1.72 KB) in 19.2ms')).toBe(1_720)
    expect(parseGitleaksScannedBytes('no scan line')).toBeNull()
  })
})

describe('runHkGitleaksProtectStaged', () => {
  const root = repoRoot()
  const skipWithoutGitleaks = !gitleaksOnPath()

  it('scans only the git index, not the whole checkout', () => {
    if (skipWithoutGitleaks) return

    const run = runHkGitleaksProtectStaged(root)
    expect(run.exitCode).toBe(0)
    expect(run.scannedBytes).not.toBeNull()
    if (run.scannedBytes === null) return
    expect(run.scannedBytes).toBeLessThan(10_000_000)
  })
})

describe('runHkGitleaksDir legacy regression', () => {
  const root = repoRoot()
  const skipWithoutGitleaks = !gitleaksOnPath()

  it('scans only the target file when one path is passed', () => {
    if (skipWithoutGitleaks) return
    expect(existsSync(path.join(root, SINGLE_OPS_PATH))).toBe(true)

    const run = runHkGitleaksDir([SINGLE_OPS_PATH], root)
    expect(run.exitCode).toBe(0)
    expect(run.scannedBytes).not.toBeNull()
    if (run.scannedBytes === null) return
    expect(run.scannedBytes).toBeLessThan(1_000_000)
  })

  describe('when multiple paths are passed to gitleaks dir', () => {
    it.skipIf(skipWithoutGitleaks || process.env.GITLEAKS_HOOK_INTEGRATION !== '1')(
      'amplifies scan far beyond the byte size of the paths (why hk uses protect --staged)',
      () => {
        for (const rel of CLOSEOUT_MULTI_PATH_SCAN) {
          expect(existsSync(path.join(root, rel))).toBe(true)
        }

        const single = runHkGitleaksDir([SINGLE_OPS_PATH], root)
        const multi = runHkGitleaksDir([...CLOSEOUT_MULTI_PATH_SCAN], root)

        expect(single.exitCode).toBe(0)
        expect(multi.exitCode).toBe(0)
        expect(single.scannedBytes).not.toBeNull()
        expect(multi.scannedBytes).not.toBeNull()
        if (single.scannedBytes === null || multi.scannedBytes === null) return

        expect(multi.scannedBytes).toBeGreaterThan(100_000_000)
        expect(multi.scannedBytes / single.scannedBytes).toBeGreaterThan(1_000)
      },
      { timeout: 120_000 }
    )
  })
})
