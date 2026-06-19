import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { REPO_ROOT } from '../support/lib/testing/spawn_bin.script'

describe('policy shim integration', () => {
  it('root bin/policy.script.ts has correct stub content', () => {
    const content = readFileSync(resolve(REPO_ROOT, 'bin/policy.script.ts'), 'utf-8')
    expect(content).toContain("import '../packages/ops/src/bin/policy.script.ts'")
  })
})
