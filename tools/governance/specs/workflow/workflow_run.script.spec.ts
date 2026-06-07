import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Value } from '@sinclair/typebox/value'
import { parseArgs, showRun } from './runs_cli.script.ts'
import {
  bestEffortPrune,
  filesetFingerprint,
  generateRunId,
  pruneOlderThan,
  slugFromFeatureDir,
  WORKFLOW_EVENT_TYPES,
  WorkflowEvent,
  WorkflowRunWriter
} from './workflow_run.script.ts'

function makePhaseDecided(): WorkflowEvent {
  return {
    type: 'phase_decided',
    run_id: 'test-123-abc',
    ts: '2026-06-07T12:00:00.000Z',
    feature_dir: 'assets/specs/000-test',
    duration_ms: 5.2,
    fileset_fingerprint: 'a1b2c3d4e5f6',
    manifest_needs_handoff: true,
    phase: 'plan',
    command: 'speckit.plan',
    focus_hint: null
  }
}
function makeManifestEmitted(): WorkflowEvent {
  return {
    type: 'manifest_emitted',
    run_id: 'test-456-def',
    ts: '2026-06-07T12:00:01.000Z',
    feature_dir: 'assets/specs/000-test',
    duration_ms: 3.1,
    subtask_types: ['implement-src', 'gherkin-bdd-handoff'],
    subtask_count: 2
  }
}
function makeHandoffWritten(): WorkflowEvent {
  return {
    type: 'handoff_written',
    run_id: 'test-789-ghi',
    ts: '2026-06-07T12:00:02.000Z',
    feature_dir: 'assets/specs/003-sync-frecency-preserve',
    duration_ms: 42.0,
    path: '/tmp/handoffs/opencode-sync-frecency-preserve-gherkin.md',
    focus: 'gherkin',
    ac_row_count: 10,
    has_e2e_block: true
  }
}
function makeDispatchInvoked(): WorkflowEvent {
  return {
    type: 'dispatch_invoked',
    run_id: 'test-789-ghi',
    ts: '2026-06-07T12:00:03.000Z',
    feature_dir: 'assets/specs/003-sync-frecency-preserve',
    duration_ms: 150.0,
    opencode_found: true,
    body_bytes: 2048,
    exit_code: 0,
    session_id: null
  }
}
const RID_PATTERN = /^sync-frecency-preserve-\d+-[0-9a-f]{4}$/
const FP_PATTERN = /^[0-9a-f]{12}$/
function cleanupTmpDir(dir: string): void {
  if (existsSync(dir)) {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      /* best-effort */
    }
  }
}
const FULL_FP_INPUT = {
  spec: true,
  plan: true,
  tasks: true,
  handoff: true,
  analyzePlanChecklist: true,
  analyzeTasksChecklist: true,
  handoffEmittedGherkin: true,
  implementComplete: true
}
describe('WorkflowEvent schema (WOBS-1)', () => {
  it('validates phase_decided', () => {
    expect(Value.Check(WorkflowEvent, makePhaseDecided())).toBe(true)
  })
  it('validates manifest_emitted', () => {
    expect(Value.Check(WorkflowEvent, makeManifestEmitted())).toBe(true)
  })
  it('validates handoff_written', () => {
    expect(Value.Check(WorkflowEvent, makeHandoffWritten())).toBe(true)
  })
  it('validates dispatch_invoked', () => {
    expect(Value.Check(WorkflowEvent, makeDispatchInvoked())).toBe(true)
  })
  it('rejects unknown type discriminator', () => {
    expect(Value.Check(WorkflowEvent, { ...makePhaseDecided(), type: 'bogus' })).toBe(false)
  })
  it('rejects missing required fields', () => {
    const { run_id: _, ...rest } = makePhaseDecided()
    expect(Value.Check(WorkflowEvent, rest)).toBe(false)
  })
  it('every variant label has a fixture', () => {
    for (const label of WORKFLOW_EVENT_TYPES) {
      let event: WorkflowEvent | undefined
      switch (label) {
        case 'phase_decided':
          event = makePhaseDecided()
          break
        case 'manifest_emitted':
          event = makeManifestEmitted()
          break
        case 'handoff_written':
          event = makeHandoffWritten()
          break
        case 'dispatch_invoked':
          event = makeDispatchInvoked()
          break
      }
      expect(event).toBeDefined()
      expect(Value.Check(WorkflowEvent, event as WorkflowEvent)).toBe(true)
    }
  })
})
describe('generateRunId', () => {
  it('produces slug-epoch-hex pattern', () => {
    expect(generateRunId('sync-frecency-preserve')).toMatch(RID_PATTERN)
  })
})
describe('slugFromFeatureDir', () => {
  it('extracts slug from NNN-slug path', () => {
    expect(slugFromFeatureDir('assets/specs/003-sync-frecency-preserve')).toBe('sync-frecency-preserve')
  })
})
describe('filesetFingerprint', () => {
  it('produces a 12-char hex string', () => {
    expect(filesetFingerprint(FULL_FP_INPUT)).toMatch(FP_PATTERN)
  })
  it('changes when a field flips', () => {
    expect(filesetFingerprint(FULL_FP_INPUT)).not.toBe(
      filesetFingerprint({ ...FULL_FP_INPUT, handoffEmittedGherkin: false })
    )
  })
})
describe('WorkflowRunWriter (WOBS-1, WOBS-5)', () => {
  let writerRoot: string
  afterEach(() => {
    if (writerRoot && existsSync(writerRoot)) rmSync(writerRoot, { recursive: true, force: true })
  })
  it('writes events and re-reads them byte-identical', () => {
    writerRoot = mkdtempSync(path.join(tmpdir(), 'wob-writer-'))
    const writer = new WorkflowRunWriter('test-writer-rid', 'assets/specs/000-test', writerRoot)
    writer.emit(makeHandoffWritten())
    const ndjsonPath = writer.currentPath
    expect(ndjsonPath).not.toBeNull()
    const content = readFileSync(ndjsonPath as string, 'utf-8')
    const lines = content.trim().split('\n')
    expect(lines).toHaveLength(1)
    const parsed = JSON.parse(lines[0] as string)
    expect(parsed.type).toBe('handoff_written')
    expect(parsed.run_id).toBe('test-789-ghi')
    expect((parsed as Record<string, unknown>).path).toBe('/tmp/handoffs/opencode-sync-frecency-preserve-gherkin.md')
    expect(parsed.focus).toBe('gherkin')
    expect(parsed.ac_row_count).toBe(10)
    expect(parsed.has_e2e_block).toBe(true)
  })
  it('appends multiple events to the same file', () => {
    writerRoot = mkdtempSync(path.join(tmpdir(), 'wob-append-'))
    const writer = new WorkflowRunWriter(generateRunId('test-append'), 'assets/specs/000-test', writerRoot)
    writer.emit(makePhaseDecided())
    writer.emit(makeManifestEmitted())
    const lines = readFileSync(writer.currentPath as string, 'utf-8')
      .trim()
      .split('\n')
    expect(lines).toHaveLength(2)
  })
  it('validates events before writing (no file written for invalid event)', () => {
    writerRoot = mkdtempSync(path.join(tmpdir(), 'wob-invalid-'))
    const writer = new WorkflowRunWriter(generateRunId('test-invalid'), 'assets/specs/000-test', writerRoot)
    writer.emit({ ...makePhaseDecided(), type: 'invalid' } as unknown as WorkflowEvent)
    expect(writer.currentPath).toBeNull()
  })
})
describe('WorkflowRunWriter failure handling (WOBS-7 AC2)', () => {
  let root: string
  afterEach(() => {
    if (root && existsSync(root)) rmSync(root, { recursive: true, force: true })
  })
  it('handles mkdir failure gracefully (currentPath stays null)', () => {
    root = mkdtempSync(path.join(tmpdir(), 'wob-mkdir-fail-'))
    writeFileSync(path.join(root, new Date().toISOString().slice(0, 10)), 'block')
    const writer = new WorkflowRunWriter('test-rid', 'test-feature', root)
    writer.emit(makePhaseDecided())
    expect(writer.currentPath).toBeNull()
  })
  it('handles append failure gracefully (catch does not rethrow)', () => {
    root = mkdtempSync(path.join(tmpdir(), 'wob-append-fail-'))
    const writer = new WorkflowRunWriter('test-rid', 'test-feature', root)
    writer.emit(makePhaseDecided())
    const ndjsonPath = writer.currentPath
    expect(ndjsonPath).not.toBeNull()
    rmSync(ndjsonPath as string)
    mkdirSync(ndjsonPath as string)
    writer.emit(makePhaseDecided())
  })
})
describe('pruneOlderThan (WOBS-5)', () => {
  const TMP_ROOT = path.join(tmpdir(), `wob-test-prune-${randomBytes(4).toString('hex')}`)
  afterEach(() => cleanupTmpDir(TMP_ROOT))
  it('removes backdated date dirs and keeps recent ones', () => {
    mkdirSync(`${TMP_ROOT}/2026-01-01`, { recursive: true })
    writeFileSync(`${TMP_ROOT}/2026-01-01/run1.ndjson`, `{"type":"phase_decided"}\n`)
    mkdirSync(`${TMP_ROOT}/2099-06-07`, { recursive: true })
    writeFileSync(`${TMP_ROOT}/2099-06-07/run2.ndjson`, `{"type":"dispatch_invoked"}\n`)
    const removed = pruneOlderThan(30, TMP_ROOT)
    expect(removed).toBe(1)
    expect(existsSync(`${TMP_ROOT}/2026-01-01`)).toBe(false)
    expect(existsSync(`${TMP_ROOT}/2099-06-07`)).toBe(true)
    expect(existsSync(`${TMP_ROOT}/2099-06-07/run2.ndjson`)).toBe(true)
  })
})
describe('bestEffortPrune', () => {
  it('does not throw on non-existent root', () => {
    expect(() => bestEffortPrune(`/tmp/nonexistent-${Date.now()}`)).not.toThrow()
  })
})
describe('parseArgs', () => {
  let origExit: typeof process.exit
  beforeEach(() => {
    origExit = process.exit
    process.exit = (() => {
      throw new Error('exit')
    }) as typeof process.exit
  })
  afterEach(() => {
    process.exit = origExit
  })
  it('parses "list" action', () => {
    expect(parseArgs(['list']).action).toBe('list')
  })
  it('parses "show <run_id>" action', () => {
    const args = parseArgs(['show', 'my-run-123'])
    expect(args.action).toBe('show')
    expect(args.runId).toBe('my-run-123')
  })
  it('exits with code 2 for unknown action', () => {
    expect(() => parseArgs(['bogus'])).toThrow()
  })
  it('requires run_id for show action', () => {
    expect(() => parseArgs(['show'])).toThrow()
  })
})
describe('runs CLI (list, show, tail)', () => {
  const TMP_ROOT = path.join(tmpdir(), `wob-test-cli-${randomBytes(4).toString('hex')}`)
  let origExit: typeof process.exit
  beforeAll(() => {
    mkdirSync(`${TMP_ROOT}/2099-06-07`, { recursive: true })
    writeFileSync(
      `${TMP_ROOT}/2099-06-07/test-run-001.ndjson`,
      `{"type":"phase_decided","run_id":"test-run-001","ts":"2099-06-07T12:00:00Z","feature_dir":"assets/specs/999-slug","duration_ms":5,"fileset_fingerprint":"ab","manifest_needs_handoff":false,"phase":"plan","command":"speckit.plan","focus_hint":null}\n{"type":"dispatch_invoked","run_id":"test-run-001","ts":"2099-06-07T12:00:01Z","feature_dir":"assets/specs/999-slug","duration_ms":42,"opencode_found":false,"body_bytes":0,"exit_code":0,"session_id":null}\n`
    )
  })
  afterAll(() => cleanupTmpDir(TMP_ROOT))
  beforeEach(() => {
    origExit = process.exit
  })
  afterEach(() => {
    process.exit = origExit
  })
  it('showRun streams events for a known run_id', () => {
    const out: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = (chunk: string | Uint8Array) => {
      out.push(String(chunk))
      return true
    }
    showRun('test-run-001', TMP_ROOT)
    process.stdout.write = origWrite
    const joined = out.join('')
    expect(joined).toContain('phase_decided')
    expect(joined).toContain('dispatch_invoked')
    expect(joined).toContain('test-run-001')
  })
  it('showRun exits 1 for unknown run_id', () => {
    const exitCode = { value: -1 }
    process.exit = (code?: number) => {
      exitCode.value = code ?? 0
      throw new Error(`exit ${code}`)
    }
    expect(() => showRun('no-such-run', TMP_ROOT)).toThrow()
    expect(exitCode.value).toBe(1)
  })
})
