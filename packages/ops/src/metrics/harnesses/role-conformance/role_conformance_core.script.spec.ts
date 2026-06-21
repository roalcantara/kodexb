// @arch_role_taxonomy
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
    const rows = [classifyUtil('a.util.ts', 'export const a=1'), classifyUtil('b.util.ts', "import 'node:os'")]
    const m = computeMetrics(rows, { locked: 1, roleDirs: 4 })
    expect(m).toEqual({
      totalUtil: 2,
      mislabeledUtilCount: 1,
      utilPurityRatio: 0.5,
      enforcedDirRatio: 0.25,
      suffixViolations: 1
    })
  })

  // ── MIGR-1 AC1: type-only imports MUST NOT count as I/O ─────────────────
  describe('MIGR-1 AC1 — type-only imports are pure', () => {
    it('ignores `import type` from electrobun', () => {
      expect(isPureUtil("import type { Display } from 'electrobun/bun'\nexport const x = 1")).toBe(true)
    })
    it('ignores `import type` from bun:sqlite', () => {
      expect(isPureUtil("import type { Database } from 'bun:sqlite'\nexport const fn = () => 1")).toBe(true)
    })
    it('ignores `import type` from node:fs', () => {
      expect(isPureUtil("import type { Stats } from 'node:fs'\nexport const fn = () => 1")).toBe(true)
    })
    it('ignores multiline `import type {` blocks', () => {
      const src = ['import type {', '  Display,', '  Window', "} from 'electrobun/bun'", 'export const x = 1'].join(
        '\n'
      )
      expect(isPureUtil(src)).toBe(true)
    })
    it('still flags a value import alongside a type import', () => {
      const src = [
        "import type { Display } from 'electrobun/bun'",
        "import { openWindow } from 'electrobun/bun'",
        'export const x = 1'
      ].join('\n')
      expect(isPureUtil(src)).toBe(false)
    })
  })

  // ── MIGR-1 AC2: pure Node modules MUST NOT flag; runtime I/O still flags ─
  describe('MIGR-1 AC2 — pure Node modules are pure', () => {
    it.each([
      ['node:path', "import path from 'node:path'"],
      ['node:url', "import { fileURLToPath } from 'node:url'"],
      ['node:querystring', "import qs from 'node:querystring'"],
      ['node:util', "import { format } from 'node:util'"],
      ['node:assert', "import assert from 'node:assert'"]
    ])('treats %s as pure', (_label, src) => {
      expect(isPureUtil(src)).toBe(true)
    })
  })

  describe('MIGR-1 AC2 — runtime I/O modules still flag', () => {
    it.each([
      ['node:fs', "import * as fs from 'node:fs'"],
      ['node:fs/promises', "import fs from 'node:fs/promises'"],
      ['node:child_process', "import { spawn } from 'node:child_process'"],
      ['node:os', "import os from 'node:os'"],
      ['node:net', "import net from 'node:net'"],
      ['node:http', "import http from 'node:http'"],
      ['node:https', "import https from 'node:https'"]
    ])('flags %s as impure', (_label, src) => {
      expect(isPureUtil(src)).toBe(false)
    })
    it('flags value import of bun:sqlite', () => {
      expect(isPureUtil("import { Database } from 'bun:sqlite'")).toBe(false)
    })
    it('flags value import of electrobun', () => {
      expect(isPureUtil("import { openWindow } from 'electrobun/bun'")).toBe(false)
    })
    it('flags Bun.$ template tag', () => {
      expect(isPureUtil('await Bun.$`ls`')).toBe(false)
    })
    it('flags Bun.spawn', () => {
      expect(isPureUtil('Bun.spawn(["ls"])')).toBe(false)
    })
    it('flags fetch(', () => {
      expect(isPureUtil('const r = await fetch(u)')).toBe(false)
    })
  })

  describe('MIGR-1 regression — pure geometry helpers are pure', () => {
    it('treats placement.util-style code as pure', () => {
      const src = [
        "import type { Display } from 'electrobun/bun'",
        'export const center = (w: number, h: number) => ({ x: w / 2, y: h / 2 })'
      ].join('\n')
      expect(isPureUtil(src)).toBe(true)
    })
    it('treats path-only compute as pure', () => {
      const src = [
        "import path from 'node:path'",
        'export const join = (a: string, b: string) => path.join(a, b)'
      ].join('\n')
      expect(isPureUtil(src)).toBe(true)
    })
  })
})
