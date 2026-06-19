import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { KB_KIT_SMOKE_ENV } from '@kb/exec/kit_smoke.script'
import { prepareSmokeFixture, SMOKE_FIXTURE, smokeChildEnv, teardownSmokeFixture } from './smoke_harness.script'

const gatesDir = path.join(SMOKE_FIXTURE, '.gates')

describe('smoke_harness', () => {
  afterEach(() => {
    rmSync(gatesDir, { recursive: true, force: true })
    rmSync(path.join(SMOKE_FIXTURE, 'checklists/requirements.md'), { force: true })
    rmSync(path.join(SMOKE_FIXTURE, 'checklists/implement-done.md'), { force: true })
  })

  it('prepareSmokeFixture seeds gates and requirements.md', () => {
    const state = prepareSmokeFixture()
    expect(existsSync(path.join(gatesDir, 'review-spec.approved'))).toBe(true)
    expect(existsSync(path.join(SMOKE_FIXTURE, 'checklists/requirements.md'))).toBe(true)
    teardownSmokeFixture(state)
    expect(existsSync(path.join(SMOKE_FIXTURE, 'checklists/requirements.md'))).toBe(false)
  })

  it('smokeChildEnv sets KB_KIT_SMOKE', () => {
    expect(smokeChildEnv()[KB_KIT_SMOKE_ENV]).toBe('1')
  })

  it('teardownSmokeFixture preserves pre-existing requirements.md', () => {
    const reqPath = path.join(SMOKE_FIXTURE, 'checklists/requirements.md')
    writeFileSync(reqPath, '# committed fixture\n')
    const state = prepareSmokeFixture()
    expect(state.createdPaths).not.toContain('checklists/requirements.md')
    teardownSmokeFixture(state)
    expect(existsSync(reqPath)).toBe(true)
    expect(readFileSync(reqPath, 'utf-8')).toBe('# committed fixture\n')
  })
})
