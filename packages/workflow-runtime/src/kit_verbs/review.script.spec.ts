import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { run } from './review.script.ts'

describe('kit review', () => {
  let scratchDir: string
  let origCwd: string

  beforeEach(() => {
    origCwd = process.cwd()
    scratchDir = path.join(tmpdir(), `review-test-${Date.now()}`)
    mkdirSync(scratchDir, { recursive: true })
    process.chdir(scratchDir)
  })

  afterEach(() => {
    process.chdir(origCwd)
    rmSync(scratchDir, { recursive: true, force: true })
  })

  it('dispatch module exports a run function', () => {
    expect(typeof run).toBe('function')
  })

  it('returns 0 for APPROVE verdict (no review handoff file exists)', () => {
    const code = run([])
    expect(code).toBe(0)
  })

  it('returns non-zero for FIX verdict when review handoff exists', () => {
    const handoffsDir = path.join(scratchDir, 'tmp', 'handoffs')
    mkdirSync(handoffsDir, { recursive: true })
    const reviewPath = path.join(handoffsDir, 'review-feature.md')
    writeFileSync(reviewPath, '# Review findings\n- Issue 1')
    const code = run(['--feature', 'feature'])
    expect(code).toBe(1)
  })
})
