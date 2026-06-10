import { gumBold, gumFail, gumMuted, gumOk, statusGlyph } from './gum_theme.script.ts'
import { chooseRenderer, type RenderMode } from './render_mode.script.ts'

export type StepResult = {
  id: string
  title: string
  ok: boolean
  exit: number
  duration_ms: number
  log_tail?: string
}

export type TaskRunReport = {
  task: string
  command: string
  ok: boolean
  duration_ms: number
  steps: StepResult[]
}

export type RunStepsInput = {
  task: string
  command: string
  steps: { id: string; title: string; run: () => number | { exitCode: number } }[]
  renderMode: RenderMode
}

export function runSteps(input: RunStepsInput): TaskRunReport {
  const t0 = performance.now()
  const results: StepResult[] = []
  let halted = false

  const report: TaskRunReport = {
    task: input.task,
    command: input.command,
    ok: true,
    duration_ms: 0,
    steps: results
  }

  for (const step of input.steps) {
    if (halted) {
      results.push({ id: step.id, title: step.title, ok: false, exit: -1, duration_ms: 0 })
      continue
    }

    const s0 = performance.now()
    const outcome = step.run()
    const exitCode = typeof outcome === 'number' ? outcome : (outcome.exitCode ?? 1)
    const duration = Math.round(performance.now() - s0)

    const ok = exitCode === 0
    results.push({ id: step.id, title: step.title, ok, exit: exitCode, duration_ms: duration })

    if (!ok) {
      report.ok = false
      halted = true
    }
  }

  report.duration_ms = Math.round(performance.now() - t0)
  return report
}

export function renderTaskReport(report: TaskRunReport, mode: RenderMode): void {
  if (mode === 'raw') {
    for (const s of report.steps) {
      const status = s.exit < 0 ? 'skip' : s.ok ? 'ok' : 'fail'
      console.log(`STEP ${s.id} ${status} exit=${s.exit} ms=${s.duration_ms} ${s.title}`)
    }
    const failed = report.steps.filter(s => !s.ok).length
    console.log(
      `TASK ${report.task} ${report.ok ? 'ok' : 'fail'} ms=${report.duration_ms} steps=${report.steps.length} failed=${failed}`
    )
    return
  }

  if (mode === 'json') {
    console.log(JSON.stringify(report))
    return
  }

  console.log(gumBold(report.task))
  console.log(gumMuted(`  ${report.command}`))
  for (const s of report.steps) {
    const glyph = statusGlyph(s.ok)
    const line = `  ${glyph} ${s.title}`
    if (s.ok) {
      console.log(line)
    } else {
      console.log(gumFail(line))
    }
  }
  console.log('')
  const failed = report.steps.filter(s => !s.ok).length
  if (report.ok) {
    console.log(gumOk(`  ${report.steps.length}/${report.steps.length} steps passed (${report.duration_ms}ms)`))
  } else {
    console.log(gumFail(`  ${failed} step(s) failed (${report.duration_ms}ms)`))
  }
}

export function runStepsAndPrint(
  input: Omit<RunStepsInput, 'renderMode'>,
  opts: { json: boolean; raw: boolean }
): TaskRunReport {
  const mode = chooseRenderer({ json: opts.json, raw: opts.raw, isTty: process.stdout.isTTY })
  const report = runSteps({ ...input, renderMode: mode })
  renderTaskReport(report, mode)
  return report
}
