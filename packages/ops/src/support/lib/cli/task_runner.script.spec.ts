import { describe, expect, it } from 'bun:test'
import { type RunStepsInput, renderTaskReport, runSteps, type TaskRunReport } from './task_runner.script'

const RE_STEP_LINT = /^STEP lint ok exit=0 ms=500 spec lint/
const RE_STEP_TRACE = /^STEP trace ok exit=0 ms=300 trace e2e/
const RE_STEP_SEC = /^STEP security ok exit=0 ms=100 spec security/
const RE_STEP_GATE = /^STEP gate ok exit=0 ms=200 bash gate/
const RE_TASK_OK = /^TASK spec-gate ok ms=1234 steps=4 failed=0/
const RE_STEP_A = /STEP a ok exit=0 ms=10 first ok/
const RE_STEP_B = /STEP b fail exit=2 ms=5 fails/
const RE_STEP_C = /STEP c skip exit=-1 ms=0 skipped/
const RE_TASK_FAIL = /TASK bad fail ms=100 steps=3 failed=2/

function makeInput(steps: Partial<RunStepsInput['steps'][number]>[]): RunStepsInput {
  return {
    task: 'test-task',
    command: 'bun test',
    steps: steps.map((s, i) => ({
      id: s?.id ?? `step-${i + 1}`,
      title: s?.title ?? `Step ${i + 1}`,
      run: s?.run ?? (() => 0)
    })) as RunStepsInput['steps'],
    renderMode: 'raw'
  }
}

describe('runSteps', () => {
  it('passes all steps', () => {
    const report = runSteps(makeInput([{ run: () => 0 }, { run: () => 0 }, { run: () => 0 }]))
    expect(report.ok).toBe(true)
    expect(report.steps.length).toBe(3)
    for (const s of report.steps) expect(s.ok).toBe(true)
    expect(report.steps.every(s => s.exit === 0)).toBe(true)
  })

  it('halts on first failure', () => {
    const report = runSteps(
      makeInput([
        { id: 'pass', run: () => 0 },
        { id: 'fail', run: () => 2 },
        { id: 'skipped', run: () => 0 }
      ])
    )
    expect(report.ok).toBe(false)
    expect(report.steps[0]?.ok).toBe(true)
    expect(report.steps[1]?.ok).toBe(false)
    expect(report.steps[2]?.ok).toBe(false)
    expect(report.steps[2]?.exit).toBe(-1)
  })

  it('handles exitCode object form', () => {
    const report = runSteps(makeInput([{ run: () => ({ exitCode: 1 }) }]))
    expect(report.ok).toBe(false)
    expect(report.steps[0]?.exit).toBe(1)
  })

  it('measures duration', () => {
    const report = runSteps(
      makeInput([
        { id: 'a', run: () => 0 },
        { id: 'b', run: () => 0 }
      ])
    )
    expect(report.duration_ms).toBeGreaterThanOrEqual(0)
    for (const s of report.steps) expect(s.duration_ms).toBeGreaterThanOrEqual(0)
  })
})

describe('renderTaskReport raw mode', () => {
  const report: TaskRunReport = {
    task: 'spec-gate',
    command: 'bun packages/ops/src/bin/spec.script',
    ok: true,
    duration_ms: 1234,
    steps: [
      { id: 'lint', title: 'spec lint on __fixtures__/NNN-demo', ok: true, exit: 0, duration_ms: 500 },
      { id: 'trace', title: 'trace e2e table', ok: true, exit: 0, duration_ms: 300 },
      { id: 'security', title: 'spec security check', ok: true, exit: 0, duration_ms: 100 },
      { id: 'gate', title: 'bash gate.sh', ok: true, exit: 0, duration_ms: 200 }
    ]
  }

  function capture(fn: () => void): string {
    const lines: string[] = []
    const orig = console.log
    console.log = (s: string) => lines.push(s)
    try {
      fn()
    } finally {
      console.log = orig
    }
    return lines.join('\n')
  }

  it('emits STEP lines then TASK summary', () => {
    const out = capture(() => renderTaskReport(report, 'raw'))
    const lines = out.split('\n').filter(Boolean)
    expect(lines[0]).toMatch(RE_STEP_LINT)
    expect(lines[1]).toMatch(RE_STEP_TRACE)
    expect(lines[2]).toMatch(RE_STEP_SEC)
    expect(lines[3]).toMatch(RE_STEP_GATE)
    expect(lines[4]).toMatch(RE_TASK_OK)
  })

  it('marks failed and skipped steps', () => {
    const r: TaskRunReport = {
      task: 'bad',
      command: 'x',
      ok: false,
      duration_ms: 100,
      steps: [
        { id: 'a', title: 'first ok', ok: true, exit: 0, duration_ms: 10 },
        { id: 'b', title: 'fails', ok: false, exit: 2, duration_ms: 5 },
        { id: 'c', title: 'skipped', ok: false, exit: -1, duration_ms: 0 }
      ]
    }
    const out = capture(() => renderTaskReport(r, 'raw'))
    expect(out).toMatch(RE_STEP_A)
    expect(out).toMatch(RE_STEP_B)
    expect(out).toMatch(RE_STEP_C)
    expect(out).toMatch(RE_TASK_FAIL)
  })
})

describe('runSteps with command argv (raw mode)', () => {
  it('runs a command step directly and records exit 0', () => {
    const report = runSteps({
      task: 'cmd-task',
      command: 'x',
      renderMode: 'raw',
      steps: [{ id: 'ok', title: 'true', command: ['sh', '-c', 'exit 0'] }]
    })
    expect(report.ok).toBe(true)
    expect(report.steps[0]?.exit).toBe(0)
  })

  it('propagates a non-zero command exit and halts', () => {
    const report = runSteps({
      task: 'cmd-task',
      command: 'x',
      renderMode: 'raw',
      steps: [
        { id: 'bad', title: 'false', command: ['sh', '-c', 'exit 3'] },
        { id: 'after', title: 'skipped', command: ['sh', '-c', 'exit 0'] }
      ]
    })
    expect(report.ok).toBe(false)
    expect(report.steps[0]?.exit).toBe(3)
    expect(report.steps[1]?.exit).toBe(-1)
  })
})

describe('runStepsAndPrint', () => {
  it('is importable', async () => {
    const mod = await import('./task_runner.script')
    expect(typeof mod.runStepsAndPrint).toBe('function')
  })
})
