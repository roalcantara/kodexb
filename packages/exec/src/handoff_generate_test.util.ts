import { expect } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { slugFromFeatureDir } from './handoff_generate.script'
import type { WorkflowRunWriter } from './workflow_run.script'

export function readHandoffEvents(writer: WorkflowRunWriter) {
  const raw = readFileSync(writer.currentPath as string, 'utf-8').trim()
  const lines = raw.split('\n').filter(Boolean)
  return { raw, lines }
}

/** Called from it() blocks in handoff_generate.script.spec.ts */
export function assertHandoffFile(root: string) {
  const slug = slugFromFeatureDir(root)
  const handoffFilePath = path.resolve('tmp/handoffs', `opencode-${slug}-gherkin.md`)
  // biome-ignore lint/suspicious/noMisplacedAssertion: test helper invoked from it()
  expect(existsSync(handoffFilePath)).toBe(true)
  return { slug, handoffFilePath }
}
