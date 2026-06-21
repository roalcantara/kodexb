import { describe, expect, it } from 'bun:test'
import { classifyUtil, computeMetrics, isPureUtil } from './role_conformance_core.script'

describe('role_conformance_core', () => {
  it('flags a util importing node: as not pure', () => {
    expect(isPureUtil("import fs from 'node:fs'\nexport const x = 1")).toBe(false)
  })
  it('treats a side-effect-free helper as pure', () => {
    expect(isPureUtil('export const add = (a: number, b: number) => a + b')).toBe(true)
  })
  it('flags Bun.$ / electrobun / bun:sqlite / fetch as not pure', () => {
    expect(isPureUtil('await Bun.$`ls`')).toBe(false)
    expect(isPureUtil("import { x } from 'electrobun/bun'")).toBe(false)
    expect(isPureUtil("import { Database } from 'bun:sqlite'")).toBe(false)
    expect(isPureUtil('const r = await fetch(url)')).toBe(false)
  })
  it('classifyUtil verdicts pure->keep-util, impure->rename', () => {
    expect(classifyUtil('a.util.ts', 'export const a=1').verdict).toBe('keep-util')
    expect(classifyUtil('b.util.ts', "import 'node:os'").verdict).toBe('rename')
  })
  it('computeMetrics derives ratios', () => {
    const rows = [
      classifyUtil('a.util.ts', 'export const a=1'),
      classifyUtil('b.util.ts', "import 'node:os'")
    ]
    const m = computeMetrics(rows, { locked: 1, roleDirs: 4 })
    expect(m).toEqual({
      totalUtil: 2,
      mislabeledUtilCount: 1,
      utilPurityRatio: 0.5,
      enforcedDirRatio: 0.25,
      suffixViolations: 1
    })
  })
})
