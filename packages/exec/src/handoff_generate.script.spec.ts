import { describe, expect, it } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
} from './handoff_generate.script'
import { assertHandoffFile, readHandoffEvents } from './handoff_generate_test.util'
import { generateRunId, WorkflowRunWriter } from './workflow_run.script'

type AcRowLike = AcRow

const PILOT_FEATURE_DIR = 'packages/ops/src/__tests__/fixtures/003-sync-frecency-preserve'

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
    expect(slugFromFeatureDir('packages/ops/src/__tests__/fixtures/003-sync-frecency-preserve')).toBe(
      'sync-frecency-preserve'
    )
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
      featureDir: 'packages/ops/src/__tests__/fixtures/003-sync-frecency-preserve',
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
    const args = parseArgs(['--feature', 'packages/ops/src/__tests__/fixtures/003-x'])
    expect(args.featureDir).toBe('packages/ops/src/__tests__/fixtures/003-x')
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

describe('fixture handoff data', () => {
  it('emits a prompt that references the catalog tag, e2e block, and AC tags', () => {
    const handoffMd = [
      '| ID       | Done when                  | Evidence                                  |',
      '| -------- | -------------------------- | ----------------------------------------- |',
      '| SF-1 AC1 | List order preserved       | `mise run test tag foo sf1ac1`            |',
      '| SF-3 AC3 | UI sync no restart         | Operator smoke below — pending human run  |',
      '| SF-4 AC2 | Another unit check         | `bun test packages/ops/src/governance/specs/workflow`|',
      '| SF-5 AC1 | Another unit check         | `bun test packages/ops/src/governance/specs/workflow`|',
      '| SF-6 AC1 | Another unit check         | `bun test packages/ops/src/governance/specs/workflow`|',
      '| SF-7 AC1 | Another unit check         | `bun test packages/ops/src/governance/specs/workflow`|',
      '| SF-8 AC1 | Another unit check         | `bun test packages/ops/src/governance/specs/workflow`|',
      '| SF-9 AC1 | Another unit check         | `bun test packages/ops/src/governance/specs/workflow`|',
      '| SF-10 AC1 | Another unit check        | `bun test packages/ops/src/governance/specs/workflow`|'
    ].join('\n')
    const rows = parseHandoffAcTable(handoffMd)
    expect(rows.length).toBeGreaterThanOrEqual(9)
    const sf3ac3 = rows.find(r => r.id === 'SF-3 AC3')
    expect(sf3ac3?.isOperatorSmoke).toBe(true)
    const sf1ac1 = rows.find(r => r.id === 'SF-1 AC1')
    expect(sf1ac1?.sliceId).toBe('sf1ac1')

    const planMd = 'File touch list:\n- `assets/features/sync.feature`\n- `bdd/unit/steps/sync.steps.ts`\n'
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

describe('WOBS-3: event emission', () => {
  function fixture(root: string, table: string) {
    writeFileSync(path.join(root, 'handoff.md'), table)
  }

  it('AC1: run() emits handoff_written with path, focus, ac_row_count, has_e2e_block, duration_ms', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hg-w3a-'))
    const runsDir = mkdtempSync(path.join(tmpdir(), 'hg-w3a-r-'))
    fixture(
      root,
      '| ID | Done when | Evidence |\n| --- | --------- | -------- |\n| SF-1 AC1 | works | bun test x |\n| SF-2 AC1 | smoke | Operator smoke below |'
    )
    const writer = new WorkflowRunWriter(generateRunId('test-w3a'), root, runsDir)
    const savedLog = console.log
    console.log = () => undefined
    try {
      run(['--feature', root], { writer, skipScrub: true })
    } finally {
      console.log = savedLog
    }
    const event = JSON.parse(readFileSync(writer.currentPath as string, 'utf-8').trim())
    expect(event.type).toBe('handoff_written')
    expect(typeof event.path).toBe('string')
    expect(event.focus).toBe('gherkin')
    expect(event.ac_row_count).toBe(2)
    expect(event.has_e2e_block).toBe(true)
    expect(typeof event.duration_ms).toBe('number')
    rmSync(root, { recursive: true, force: true })
    rmSync(runsDir, { recursive: true, force: true })
  })

  it('AC2: --dry-run returns 0 and does NOT emit handoff_written', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hg-w3b-'))
    const runsDir = mkdtempSync(path.join(tmpdir(), 'hg-w3b-r-'))
    fixture(root, '| ID | Done when | Evidence |\n| --- | --------- | -------- |\n| SF-1 AC1 | works | bun test x |')
    const writer = new WorkflowRunWriter(generateRunId('test-w3b'), root, runsDir)
    const savedLog = console.log
    console.log = () => undefined
    try {
      const rc = run(['--feature', root, '--dry-run'], { writer, skipScrub: true })
      expect(rc).toBe(0)
    } finally {
      console.log = savedLog
    }
    expect(writer.currentPath).toBeNull()
    rmSync(root, { recursive: true, force: true })
    rmSync(runsDir, { recursive: true, force: true })
  })
})

describe('WOBS-4 AC2: run() with --dispatch emits dispatch_invoked event', () => {
  function fixture(root: string, table: string) {
    writeFileSync(path.join(root, 'handoff.md'), table)
  }

  it('run() with --dispatch emits dispatch_invoked with opencode_found=false when opencode not on PATH', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hg-w4b-'))
    const runsDir = mkdtempSync(path.join(tmpdir(), 'hg-w4b-r-'))
    fixture(root, '| ID | Done when | Evidence |\n| --- | --------- | -------- |\n| SF-1 AC1 | works | bun test x |')
    const writer = new WorkflowRunWriter(generateRunId('test-w4b'), root, runsDir)
    const savedDispatch = process.env.ORCHESTRATED_HANDOFF_DISPATCH
    process.env.ORCHESTRATED_HANDOFF_DISPATCH = '1'
    const savedLog = console.log
    console.log = () => undefined
    try {
      run(['--feature', root], { writer, which: () => null, skipScrub: true })
    } finally {
      console.log = savedLog
      process.env.ORCHESTRATED_HANDOFF_DISPATCH = savedDispatch
    }
    const { handoffFilePath } = assertHandoffFile(root)
    const { lines } = readHandoffEvents(writer)
    const handoffWritten = JSON.parse(lines[0] as string)
    const dispatchInvoked = JSON.parse(lines[1] as string)
    expect(handoffWritten.type).toBe('handoff_written')
    expect(dispatchInvoked.type).toBe('dispatch_invoked')
    expect(dispatchInvoked.opencode_found).toBe(false)
    expect(typeof dispatchInvoked.exit_code).toBe('number')
    expect(typeof dispatchInvoked.body_bytes).toBe('number')
    rmSync(handoffFilePath, { force: true })
    rmSync(root, { recursive: true, force: true })
    rmSync(runsDir, { recursive: true, force: true })
  })

  it('--dispatch flag without ORCHESTRATED_HANDOFF_DISPATCH also triggers dispatch', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hg-w4c-'))
    const runsDir = mkdtempSync(path.join(tmpdir(), 'hg-w4c-r-'))
    fixture(root, '| ID | Done when | Evidence |\n| --- | --------- | -------- |\n| SF-1 AC1 | works | bun test x |')
    const writer = new WorkflowRunWriter(generateRunId('test-w4c'), root, runsDir)
    const savedLog = console.log
    console.log = () => undefined
    try {
      run(['--feature', root, '--dispatch'], { writer, which: () => null, skipScrub: true })
    } finally {
      console.log = savedLog
    }
    const { handoffFilePath } = assertHandoffFile(root)
    const { lines } = readHandoffEvents(writer)
    expect(lines.length).toBe(2)
    expect(JSON.parse(lines[1] as string).type).toBe('dispatch_invoked')
    expect(JSON.parse(lines[1] as string).opencode_found).toBe(false)
    rmSync(handoffFilePath, { force: true })
    rmSync(root, { recursive: true, force: true })
    rmSync(runsDir, { recursive: true, force: true })
  })
})

describe('WOBS-4 AC2: dispatchToOpencode with which=null writes dispatch_invoked event', () => {
  it('emits dispatch_invoked with opencode_found=false, dispatched=false, exitCode 0', () => {
    const runsDir = mkdtempSync(path.join(tmpdir(), 'hg-w4a-'))
    const writer = new WorkflowRunWriter(generateRunId('test-w4a'), '/tmp/x', runsDir)
    const r = dispatchToOpencode('body', '/tmp/x.md', {
      which: () => null,
      writer,
      featureDir: '/tmp/x',
      log: () => undefined
    })
    expect(r.dispatched).toBe(false)
    expect(r.exitCode).toBe(0)
    const event = JSON.parse(readFileSync(writer.currentPath as string, 'utf-8').trim())
    expect(event.type).toBe('dispatch_invoked')
    expect(event.opencode_found).toBe(false)
    expect(event.exit_code).toBe(0)
    expect(typeof event.body_bytes).toBe('number')
    rmSync(runsDir, { recursive: true, force: true })
  })
})
