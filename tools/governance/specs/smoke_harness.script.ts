import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { KB_KIT_SMOKE_ENV } from '../../../packages/workflow-runtime/src/kit_smoke.script.ts'

/** Committed fixture — never a live `assets/specs/NNN-*` dir (SKO-7, 011 review). */
export const SMOKE_FIXTURE = 'tools/__tests__/fixtures/workflow/smoke-feature'

const GATE_STAGES = ['review-spec', 'review-plan', 'review-tasks', 'review-handoff'] as const

const REQUIREMENTS_REL = 'checklists/requirements.md'
const IMPLEMENT_DONE_REL = 'checklists/implement-done.md'

export type SmokeHarnessState = {
  fixtureDir: string
  createdPaths: string[]
}

export function prepareSmokeFixture(fixtureDir = SMOKE_FIXTURE): SmokeHarnessState {
  const createdPaths: string[] = []
  const gatesDir = path.join(fixtureDir, '.gates')
  mkdirSync(gatesDir, { recursive: true })
  for (const gate of GATE_STAGES) {
    writeFileSync(
      path.join(gatesDir, `${gate}.approved`),
      JSON.stringify({ stage: gate, approved: 'auto', runId: 'smoke' })
    )
  }

  for (const rel of [REQUIREMENTS_REL]) {
    const abs = path.join(fixtureDir, rel)
    if (!existsSync(abs)) {
      mkdirSync(path.dirname(abs), { recursive: true })
      writeFileSync(abs, '# Smoke requirements\n\nAuto-generated for SKO-7 smoke harness.\n')
      createdPaths.push(rel)
    }
  }

  return { fixtureDir, createdPaths }
}

export function teardownSmokeFixture(state: SmokeHarnessState): void {
  rmSync(path.join(state.fixtureDir, '.gates'), { recursive: true, force: true })
  for (const rel of [REQUIREMENTS_REL, IMPLEMENT_DONE_REL, ...state.createdPaths]) {
    rmSync(path.join(state.fixtureDir, rel), { force: true })
  }
}

export function smokeChildEnv(): Record<string, string | undefined> {
  return { ...process.env, [KB_KIT_SMOKE_ENV]: '1' }
}
