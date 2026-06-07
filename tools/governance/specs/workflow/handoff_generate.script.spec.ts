// biome-ignore lint/nursery/noExcessiveLinesPerFile: comprehensive spec
import { describe, expect, it } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  type AcRow,
  catalogKeyFromSlug,
  dispatchToOpencode,
  extractFileTouchList,
  parseArgs,
  parseHandoffAcTable,
  renderHandoffPrompt,
  run,
  slugFromFeatureDir
} from './handoff_generate.script.ts'

type AcRowLike = AcRow

const PILOT_FEATURE_DIR = 'assets/specs/003-sync-frecency-preserve'

describe('handoff scrub integration', () => {
  it('returns exit 1 when rendered body contains sensitive text', () => {
    const featureDir = mkdtempSync(path.join(tmpdir(), 'handoff-scrub-int-'))
    try {
      writeFileSync(path.join(featureDir, 'plan.md'), '# plan\n')
      writeFileSync(
        path.join(featureDir, 'handoff.md'),
        [
          '| ID | Done when | Evidence |',
          '| -- | --------- | -------- |',
          '| SF-1 AC1 | demo | token=ghp_1234567890ABCDEFGHIJKL12345 |'
        ].join('\n')
      )
      const code = run(['--feature', featureDir, '--dry-run'])
      expect(code).toBe(1)
    } finally {
      rmSync(featureDir, { recursive: true, force: true })
    }
  })
})

describe('catalogKeyFromSlug', () => {
  it('strips numeric prefix and converts dashes to underscores', () => {
    expect(catalogKeyFromSlug('sync-frecency-preserve')).toBe('sync_frecency_preserve')
  })

  it('handles slugs without numeric prefix', () => {
    expect(catalogKeyFromSlug('plain-slug')).toBe('plain_slug')
  })
})

describe('slugFromFeatureDir', () => {
  it('extracts slug from NNN-slug path', () => {
    expect(slugFromFeatureDir('assets/specs/003-sync-frecency-preserve')).toBe('sync-frecency-preserve')
  })
})

describe('parseHandoffAcTable', () => {
  it('parses a well-formed AC table', () => {
    const md = [
      '| ID       | Done when                  | Evidence                                |',
      '| -------- | -------------------------- | --------------------------------------- |',
      '| SF-1 AC1 | List order preserved       | `mise run test tag foo sf1ac1`          |',
      '| SF-3 AC3 | UI sync no restart         | Operator smoke below — pending human run |'
    ].join('\n')
    const rows = parseHandoffAcTable(md)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      id: 'SF-1 AC1',
      acTag: '@ac:SF-1_AC1',
      sliceId: 'sf1ac1',
      isOperatorSmoke: false
    })
    expect(rows[1]).toMatchObject({
      id: 'SF-3 AC3',
      acTag: '@ac:SF-3_AC3',
      sliceId: 'sf3ac3',
      isOperatorSmoke: true
    })
  })

  it('returns empty array when no table present', () => {
    expect(parseHandoffAcTable('# Heading\n\nNo table here.')).toEqual([])
  })

  it('classifies bun test evidence as not-operator-smoke', () => {
    const md = [
      '| ID       | Done when      | Evidence                                |',
      '| -------- | -------------- | --------------------------------------- |',
      '| SF-3 AC1 | Specs pass     | `bun test src/shell/app` (sync-related) |'
    ].join('\n')
    const rows = parseHandoffAcTable(md)
    expect(rows[0]?.isOperatorSmoke).toBe(false)
  })

  it('marks IDs that do not match SF-n ACm as null tag/slice', () => {
    const md = [
      '| ID       | Done when      | Evidence            |',
      '| -------- | -------------- | ------------------- |',
      '| weird-id | something      | `bun test foo`      |'
    ].join('\n')
    const rows = parseHandoffAcTable(md)
    expect(rows[0]?.acTag).toBeNull()
    expect(rows[0]?.sliceId).toBeNull()
  })
})

describe('extractFileTouchList', () => {
  it('captures bullets under explicit "File touch list" heading', () => {
    const plan = [
      '## File touch list',
      '',
      '- `src/foo/bar.ts`',
      '- `bdd/unit/steps/baz.steps.ts`',
      '',
      '## Next section'
    ].join('\n')
    expect(extractFileTouchList(plan)).toEqual(['src/foo/bar.ts', 'bdd/unit/steps/baz.steps.ts'])
  })

  it('falls back to path heuristic when no heading', () => {
    const plan = 'See assets/features/sync.feature and assets/catalog/catalog.yaml.'
    const list = extractFileTouchList(plan)
    expect(list).toContain('assets/features/sync.feature')
    expect(list).toContain('assets/catalog/catalog.yaml')
  })

  it('returns empty array for null input', () => {
    expect(extractFileTouchList(null)).toEqual([])
  })
})

describe('renderHandoffPrompt', () => {
  const baseRows = [
    {
      id: 'SF-1 AC1',
      doneWhen: 'List order preserved',
      evidence: '`mise run test tag foo sf1ac1`',
      acTag: '@ac:SF-1_AC1',
      sliceId: 'sf1ac1',
      isOperatorSmoke: false
    },
    {
      id: 'SF-3 AC3',
      doneWhen: 'UI sync no restart',
      evidence: 'Operator smoke below — pending human run',
      acTag: '@ac:SF-3_AC3',
      sliceId: 'sf3ac3',
      isOperatorSmoke: true
    }
  ] as const

  it('includes catalog key, slug, and AC tags in the prompt', () => {
    const out = renderHandoffPrompt({
      featureDir: 'assets/specs/003-sync-frecency-preserve',
      slug: 'sync-frecency-preserve',
      catalogKey: 'sync_frecency_preserve',
      focus: 'gherkin',
      worker: 'opencode',
      acRows: [...baseRows],
      fileTouchList: ['assets/features/sync.feature', 'bdd/unit/steps/sync.steps.ts'],
      planMd: null
    })
    expect(out).toContain('sync_frecency_preserve')
    expect(out).toContain('@ac:SF-1_AC1')
    expect(out).toContain('sf1ac1')
    expect(out).toContain('assets/features/sync.feature')
    expect(out).toContain('mise run test tag sync_frecency_preserve')
  })

  function renderPilotPrompt(rows: readonly AcRowLike[] = baseRows): string {
    return renderHandoffPrompt({
      featureDir: 'x',
      slug: 'sync-frecency-preserve',
      catalogKey: 'sync_frecency_preserve',
      focus: 'gherkin',
      worker: 'opencode',
      acRows: rows.map(r => ({ ...r })),
      fileTouchList: [],
      planMd: null
    })
  }

  it('emits @e2e block for operator-smoke rows under gherkin focus', () => {
    const out = renderPilotPrompt()
    expect(out).toContain('@e2e scenarios (Playwright only — NOT @unit)')
    expect(out).toContain('bdd/e2e/')
    expect(out).toContain('SF-3 AC3')
    expect(out).toContain('FIXTURE_PATHS_FILE')
    expect(out).toContain('e2eTagExpression')
    expect(out).toContain('Never route @unit scenarios through Playwright')
  })

  it('omits @e2e block when no operator-smoke rows', () => {
    const out = renderHandoffPrompt({
      featureDir: 'x',
      slug: 'all-unit',
      catalogKey: 'all_unit',
      focus: 'gherkin',
      worker: 'opencode',
      acRows: [baseRows[0]],
      fileTouchList: [],
      planMd: null
    })
    expect(out).not.toContain('@e2e scenarios (Playwright only')
  })

  it('does not route @unit rows through Playwright (no Playwright in unit slice section)', () => {
    const out = renderPilotPrompt()
    const sliceSection = out.split('## Per-AC slice commands')[1]?.split('## ')[0] ?? ''
    expect(sliceSection).not.toContain('Playwright')
    expect(sliceSection).not.toContain('playwright')
  })

  it('OHW-7 AC3: prompt references Plan skill routing and the 4-skill cap', () => {
    const out = renderPilotPrompt()
    expect(out).toContain('Plan skill routing')
    expect(out).toContain('at most 4 skills')
  })

  it('OHW-8 AC4: Per-AC slice section does NOT duplicate Evidence strings', () => {
    const out = renderPilotPrompt()
    const sliceSection = out.split('## Per-AC slice commands')[1]?.split('## ')[0] ?? ''
    // Evidence cells in the pilot fixture contain backticked test commands;
    // the slice section must not repeat them — slice id only.
    expect(sliceSection).not.toContain('mise run test tag sync_frecency_preserve sf1ac1')
    expect(sliceSection).toContain('sf1ac1')
    // The hint sentence below the list still references the run command (once),
    // but not per-row.
    const perRowDuplicates = sliceSection.match(/mise run test tag sync_frecency_preserve sf\d+ac\d+/g) ?? []
    expect(perRowDuplicates.length).toBe(0)
  })
})

describe('parseArgs', () => {
  it('parses the minimal happy path', () => {
    const args = parseArgs(['--feature', 'assets/specs/003-x'])
    expect(args.featureDir).toBe('assets/specs/003-x')
    expect(args.focus).toBe('gherkin')
    expect(args.worker).toBe('opencode')
    expect(args.dispatch).toBe(false)
  })

  it('rejects unsupported focus values', () => {
    const argv = ['--feature', 'x', '--focus', 'bogus']
    expect(() => parseArgs(argv)).toThrow()
  })

  it('rejects non-opencode workers in v1', () => {
    for (const worker of ['claude', 'codex', 'deepseek']) {
      expect(() => parseArgs(['--feature', 'x', '--worker', worker])).toThrow()
    }
  })
})

describe('dispatchToOpencode', () => {
  it('writes file and warns when opencode not on PATH', () => {
    const logs: string[] = []
    const r = dispatchToOpencode('body', '/tmp/x.md', {
      which: () => null,
      log: m => logs.push(m)
    })
    expect(r.dispatched).toBe(false)
    expect(r.exitCode).toBe(0)
    expect(logs[0]).toContain('opencode not on PATH')
    expect(logs[0]).toContain('/tmp/x.md')
  })

  it('passes small body via argv when opencode is on PATH', () => {
    const calls: { cmd: string[]; opts?: { stdin?: string } }[] = []
    const r = dispatchToOpencode('small body', '/tmp/x.md', {
      which: () => '/usr/local/bin/opencode',
      spawn: (cmd, opts) => {
        calls.push({ cmd, opts })
        return { exitCode: 0 }
      }
    })
    expect(r.dispatched).toBe(true)
    expect(calls[0]?.cmd).toEqual(['opencode', 'run', 'small body'])
    expect(calls[0]?.opts?.stdin).toBeUndefined()
  })

  it('switches to stdin when body exceeds argv-safe threshold', () => {
    const big = 'x'.repeat(64 * 1024 + 1)
    const calls: { cmd: string[]; opts?: { stdin?: string } }[] = []
    dispatchToOpencode(big, '/tmp/x.md', {
      which: () => '/usr/local/bin/opencode',
      spawn: (cmd, opts) => {
        calls.push({ cmd, opts })
        return { exitCode: 0 }
      }
    })
    expect(calls[0]?.cmd).toEqual(['opencode', 'run'])
    expect(calls[0]?.opts?.stdin).toBe(big)
  })

  it('propagates non-zero exit code from opencode', () => {
    const r = dispatchToOpencode('body', '/tmp/x.md', {
      which: () => '/usr/local/bin/opencode',
      spawn: () => ({ exitCode: 7 })
    })
    expect(r.exitCode).toBe(7)
  })
})

describe('pilot 003 (real handoff.md)', () => {
  it('emits a prompt that references the catalog tag, e2e block, and AC tags', () => {
    const handoffPath = `${PILOT_FEATURE_DIR}/handoff.md`
    if (!existsSync(handoffPath)) {
      throw new Error(`pilot 003 handoff.md missing at ${handoffPath}`)
    }
    const rows = parseHandoffAcTable(readFileSync(handoffPath, 'utf-8'))
    expect(rows.length).toBeGreaterThanOrEqual(9)
    const sf3ac3 = rows.find(r => r.id === 'SF-3 AC3')
    expect(sf3ac3?.isOperatorSmoke).toBe(true)
    const sf1ac1 = rows.find(r => r.id === 'SF-1 AC1')
    expect(sf1ac1?.sliceId).toBe('sf1ac1')

    const planMd = existsSync(`${PILOT_FEATURE_DIR}/plan.md`)
      ? readFileSync(`${PILOT_FEATURE_DIR}/plan.md`, 'utf-8')
      : null
    const fileTouches = extractFileTouchList(planMd)
    const body = renderHandoffPrompt({
      featureDir: PILOT_FEATURE_DIR,
      slug: 'sync-frecency-preserve',
      catalogKey: 'sync_frecency_preserve',
      focus: 'gherkin',
      worker: 'opencode',
      acRows: rows,
      fileTouchList: fileTouches,
      planMd
    })
    expect(body).toContain('mise run test tag sync_frecency_preserve')
    expect(body).toContain('@ac:SF-1_AC1')
    expect(body).toContain('sf1ac1')
    expect(body).toContain('@e2e scenarios (Playwright only — NOT @unit)')
    expect(body).toContain('SF-3 AC3')
    // The unit slice commands section must not mention Playwright.
    const sliceSection = body.split('## Per-AC slice commands')[1]?.split('## ')[0] ?? ''
    expect(sliceSection).not.toContain('Playwright')
  })
})
