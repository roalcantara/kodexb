/* biome-ignore-all lint/suspicious/noMisplacedAssertion: intentional test helpers called from it() blocks */
import { expect } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { generateRunId, slugFromFeatureDir, WorkflowRunWriter } from './workflow_run.script.ts'

export type FixtureKit = {
  root: string
  runsDir: string
  writer: WorkflowRunWriter
  cleanup: () => void
}

export function fixtureFeature(root: string, plan: string, hmd: string) {
  mkdirSync(path.join(root, 'checklists'), { recursive: true })
  for (const n of ['spec.md', 'plan.md', 'tasks.md', 'handoff.md']) {
    writeFileSync(path.join(root, n), n === 'plan.md' ? plan : n === 'handoff.md' ? hmd : `# ${n}`)
  }
  for (const c of ['analyze-plan.md', 'analyze-tasks.md']) writeFileSync(path.join(root, 'checklists', c), 'done')
}

export function createFixtureKit(plan: string, hmd: string, prefix: string): FixtureKit {
  const root = mkdtempSync(path.join(tmpdir(), prefix))
  const runsDir = mkdtempSync(path.join(tmpdir(), `${prefix}-r`))
  fixtureFeature(root, plan, hmd)
  const writer = new WorkflowRunWriter(generateRunId(`test-${prefix}`), root, runsDir)
  return {
    root,
    runsDir,
    writer,
    cleanup: () => {
      rmSync(root, { recursive: true, force: true })
      rmSync(runsDir, { recursive: true, force: true })
    }
  }
}

export function suppressLog<T>(fn: () => T): T {
  const saved = console.log
  console.log = () => undefined
  try {
    return fn()
  } finally {
    console.log = saved
  }
}

export function expectEventBasics(event: Record<string, unknown>, expectedType: string, featureDir: string) {
  expect(event.type).toBe(expectedType)
  expect(typeof event.run_id).toBe('string')
  expect((event.run_id as string).length).toBeGreaterThan(0)
  expect(Number.isNaN(Date.parse(event.ts as string))).toBe(false)
  expect(event.feature_dir).toBe(featureDir)
  expect(typeof event.duration_ms).toBe('number')
  expect(event.duration_ms as number).toBeGreaterThan(0)
}

export function readHandoffEvents(writer: WorkflowRunWriter) {
  const raw = readFileSync(writer.currentPath as string, 'utf-8').trim()
  const lines = raw.split('\n').filter(Boolean)
  return { raw, lines }
}

export function assertHandoffFile(root: string) {
  const slug = slugFromFeatureDir(root)
  const handoffFilePath = path.resolve('tmp/handoffs', `opencode-${slug}-gherkin.md`)
  expect(existsSync(handoffFilePath)).toBe(true)
  return { slug, handoffFilePath }
}
